import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LiteDbCacheAdapter } from '../src/cache/LiteDbCacheAdapter';
import type { ILogger } from '../src/services/LoggingService';
import * as fs from 'fs';
import * as path from 'path';
import { CachingGetMetadataUseCase } from '../src/usecases/CachingGetMetadataUseCase';
import type { ScrapedMetadata } from '../src/types';

// 実ファイル操作を維持しつつ、ESMの変更不可な名前空間を監視可能にする。
vi.mock('fs', async importOriginal => ({ ...await importOriginal<typeof fs>() }));

describe('LiteDbCacheAdapter Test Suite', () => {
  const testDbPath = path.join(process.cwd(), 'data', 'test-cache-db.json');
  let mockLogger: ILogger;

  const cleanupTestDb = () => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // ignore
      }
    }
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-10T00:00:00Z'));
    cleanupTestDb();
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as unknown as ILogger;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    cleanupTestDb();
  });

  it('値をセットして正常に取得・永続化できること', async () => {
    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger, 5000);
    await cache.set('ssis-001', 'VALUE1');

    const result = await cache.get('SSIS-001');
    expect(result).toBe('VALUE1');
    expect(mockLogger.info).toHaveBeenCalledWith('[LiteDbCache] Hit for key: SSIS-001');

    // ファイルが存在し永続化されていること
    expect(fs.existsSync(testDbPath)).toBe(true);

    // 新しいインスタンスでファイルから再読込してもデータが取得できること
    const newCacheInstance = new LiteDbCacheAdapter<string>(testDbPath, mockLogger, 5000);
    const reloadedResult = await newCacheInstance.get('SSIS-001');
    expect(reloadedResult).toBe('VALUE1');
  });

  it('デフォルト TTL が 24時間 (86400000ms) であること', async () => {
    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger);
    await cache.set('DEFAULT_TTL_KEY', 'VAL_24H');

    // ファイルを直接読み込んで expiresAt を検証
    const raw = fs.readFileSync(testDbPath, 'utf-8');
    const store = JSON.parse(raw);
    const item = store['DEFAULT_TTL_KEY'];

    expect(item).toBeDefined();
    expect(item.value).toBe('VAL_24H');
    expect(typeof item.createdAt).toBe('number');
    expect(typeof item.updatedAt).toBe('number');
    // 固定時計で24時間後を検証
    const expectedExpires = Date.now() + 86400000;
    expect(item.expiresAt).toBe(expectedExpires);
  });

  it('存在しないキーの場合に null を返すこと', async () => {
    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger);
    const result = await cache.get('NON_EXISTENT');

    expect(result).toBeNull();
    expect(mockLogger.info).toHaveBeenCalledWith('[LiteDbCache] Miss for key: NON_EXISTENT');
  });

  it('TTL 期限切れの場合に null を返しキャッシュから削除されること', async () => {
    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger, 10); // 10ms
    await cache.set('EXPIRE_KEY', 'TEMP');

    // 実時間を待たずに期限を進める
    vi.advanceTimersByTime(20);

    const result = await cache.get('EXPIRE_KEY');
    expect(result).toBeNull();
    expect(mockLogger.info).toHaveBeenCalledWith('[LiteDbCache] Expired for key: EXPIRE_KEY');
  });

  it('invalidate で指定キーが削除されること', async () => {
    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger);
    await cache.set('KEY_TO_DEL', 'VAL');
    await cache.invalidate('key_to_del');

    const result = await cache.get('KEY_TO_DEL');
    expect(result).toBeNull();
    expect(mockLogger.info).toHaveBeenCalledWith('[LiteDbCache] Invalidated key: KEY_TO_DEL');
  });

  it('clear で全てのキーがクリアされること', async () => {
    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger);
    await cache.set('K1', 'V1');
    await cache.set('K2', 'V2');
    await cache.clear();

    expect(await cache.get('K1')).toBeNull();
    expect(await cache.get('K2')).toBeNull();
    expect(mockLogger.info).toHaveBeenCalledWith('[LiteDbCache] Cleared all keys');
  });

  it('getStats で有効なエントリ数、maxEntries、defaultTtlMs、sizeBytes を取得できること', async () => {
    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger, 86400000, 500);
    const initialStats = await cache.getStats();
    expect(initialStats).toEqual({
      count: 0,
      maxEntries: 500,
      defaultTtlMs: 86400000,
      sizeBytes: 0,
    });

    await cache.set('S1', 'V1');
    await cache.set('S2', 'V2');
    const updatedStats = await cache.getStats();
    expect(updatedStats.count).toBe(2);
    expect(updatedStats.sizeBytes).toBeGreaterThan(0);
    expect(fs.statSync(testDbPath).size).toBe(updatedStats.sizeBytes);

    await cache.clear();
    const clearedStats = await cache.getStats();
    expect(clearedStats.count).toBe(0);
    expect(clearedStats.sizeBytes).toBeGreaterThan(0); // 空オブジェクト "{}" のファイルサイズ
    expect(clearedStats.sizeBytes).toBe(fs.statSync(testDbPath).size);

    // ファイル削除時の sizeBytes === 0
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    const missingFileStats = await cache.getStats();
    expect(missingFileStats.sizeBytes).toBe(0);
  });

  it('破損したファイルが存在した場合でも safe-fail し空ストアで動作すること', async () => {
    const dir = path.dirname(testDbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(testDbPath, 'INVALID JSON {{{{', 'utf-8');

    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger);
    const result = await cache.get('ANY_KEY');

    expect(result).toBeNull();
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('旧形式のキャッシュデータ（createdAt / updatedAt 未定義）を安全に読み込み補正できること', async () => {
    const dir = path.dirname(testDbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // 旧形式 JSON: value と expiresAt のみ
    const legacyData = {
      'LEGACY-001': {
        value: 'OLD_VALUE',
        expiresAt: Date.now() + 100000
      }
    };
    fs.writeFileSync(testDbPath, JSON.stringify(legacyData), 'utf-8');

    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger);
    const result = await cache.get('LEGACY-001');
    expect(result).toBe('OLD_VALUE');

    // set 実行時に永続化され、updatedAt / createdAt が保存されること
    await cache.set('NEW-001', 'NEW_VAL');
    const reloaded = JSON.parse(fs.readFileSync(testDbPath, 'utf-8'));
    expect(reloaded['LEGACY-001'].updatedAt).toBeDefined();
    expect(reloaded['LEGACY-001'].createdAt).toBeDefined();
  });

  it('最大500件 (maxEntries=500) で501件目を追加した際に最も古いLRUエントリが削除されること', async () => {
    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger, 86400000, 500);
    // 500件登録
    for (let i = 1; i <= 500; i++) {
      vi.advanceTimersByTime(1);
      await cache.set(`KEY-${i}`, `VAL-${i}`);
    }
    const stats500 = await cache.getStats();
    expect(stats500.count).toBe(500);

    // 501件目を追加
    await cache.set('KEY-501', 'VAL-501');
    const stats501 = await cache.getStats();
    expect(stats501.count).toBe(500);

    // 最古の KEY-1 が削除され、新しい KEY-501 と KEY-2〜500 が存在すること
    expect(await cache.get('KEY-1')).toBeNull();
    expect(await cache.get('KEY-501')).toBe('VAL-501');
    expect(await cache.get('KEY-500')).toBe('VAL-500');
  });

  it('get() のアクセスによってディスク書き込みを行わずにLRU順位が昇格し削除を回避できること', async () => {
    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger, 86400000, 3);
    await cache.set('A', 'VAL-A');
    vi.advanceTimersByTime(10);
    await cache.set('B', 'VAL-B');
    vi.advanceTimersByTime(10);
    await cache.set('C', 'VAL-C');

    vi.advanceTimersByTime(10);
    // A を get() してアクセス順位を最新に昇格
    const valA = await cache.get('A');
    expect(valA).toBe('VAL-A');

    // 4件目 D を追加 -> 最古は B になっているため B が削除され、A と C と D が残る
    await cache.set('D', 'VAL-D');
    expect(await cache.get('B')).toBeNull();
    expect(await cache.get('A')).toBe('VAL-A');
    expect(await cache.get('C')).toBe('VAL-C');
    expect(await cache.get('D')).toBe('VAL-D');
  });

  it('最大件数 (maxEntries) 超過時に最も古い (LRU) エントリから自動削除されること', async () => {
    // maxEntries を 3 に設定して検証
    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger, 86400000, 3);

    await cache.set('ITEM-1', 'VAL-1');
    vi.advanceTimersByTime(20);
    await cache.set('ITEM-2', 'VAL-2');
    vi.advanceTimersByTime(20);
    await cache.set('ITEM-3', 'VAL-3');
    vi.advanceTimersByTime(20);

    // ITEM-1 にアクセスして updatedAt を最新にする
    await cache.get('ITEM-1');
    vi.advanceTimersByTime(20);

    // 4件目（ITEM-4）を追加 -> ITEM-2 が最古（ITEM-1はgetで更新、ITEM-3はsetがITEM-2より後）なので削除される
    await cache.set('ITEM-4', 'VAL-4');

    expect(await cache.get('ITEM-2')).toBeNull(); // 削除された
    expect(await cache.get('ITEM-1')).toBe('VAL-1'); // アクセスされたため保持
    expect(await cache.get('ITEM-3')).toBe('VAL-3'); // 保持
    expect(await cache.get('ITEM-4')).toBe('VAL-4'); // 保持

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Evicted LRU key: ITEM-2'));
  });

  it('get のヒット・ミス・期限切れでは実ファイルに書き込まず、次の保存で変更を永続化する', async () => {
    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger);
    await cache.set('LIVE', 'value');
    await cache.set('EXPIRED', 'old', 10);
    const before = fs.readFileSync(testDbPath, 'utf-8');
    vi.advanceTimersByTime(20);
    const write = vi.spyOn(fs, 'writeFileSync');
    const rename = vi.spyOn(fs, 'renameSync');
    const unlink = vi.spyOn(fs, 'unlinkSync');

    expect(await cache.get('LIVE')).toBe('value');
    expect(await cache.get('MISSING')).toBeNull();
    expect(await cache.get('EXPIRED')).toBeNull();
    expect(write).not.toHaveBeenCalled();
    expect(rename).not.toHaveBeenCalled();
    expect(unlink).not.toHaveBeenCalled();
    expect(fs.readFileSync(testDbPath, 'utf-8')).toBe(before);

    // 再起動相当の再読込でも期限切れ値は返さず、アクセス時刻は保存時点に戻る。
    const restarted = new LiteDbCacheAdapter<string>(testDbPath, mockLogger);
    expect(await restarted.get('EXPIRED')).toBeNull();
    await restarted.set('AFTER_RESTART', 'value');
    expect(JSON.parse(fs.readFileSync(testDbPath, 'utf-8')).LIVE.updatedAt)
      .toBe(JSON.parse(before).LIVE.updatedAt);

    // 元インスタンスのアクセス時刻と削除は次の保存で永続化される。
    await cache.set('NEXT', 'value');
    const saved = JSON.parse(fs.readFileSync(testDbPath, 'utf-8'));
    expect(saved.EXPIRED).toBeUndefined();
    expect(saved.LIVE.updatedAt).toBe(Date.now());
  });

  it.each(['EBUSY', 'EPERM'])('%s の一時的な置換失敗後に再試行して成功する', async code => {
    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger);
    const rename = vi.spyOn(fs, 'renameSync').mockImplementationOnce(() => {
      throw Object.assign(new Error('temporarily locked'), { code });
    });
    await cache.set('KEY', 'value');
    expect(rename).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fs.readFileSync(testDbPath, 'utf-8')).KEY.value).toBe('value');
    expect(await cache.get('KEY')).toBe('value');
  });

  it.each([
    ['EBUSY', 3], ['EPERM', 3], ['EACCES', 1], ['ENOENT', 1],
  ])('%s の保存失敗は %s 回で終了し、メモリとディスクを保持する', async (code, attempts) => {
    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger);
    await cache.set('KEY', 'original');
    const before = fs.readFileSync(testDbPath, 'utf-8');
    const error = Object.assign(new Error('replace failed'), { code });
    const rename = vi.spyOn(fs, 'renameSync').mockImplementation(() => { throw error; });
    for (const operation of [
      () => cache.set('KEY', 'changed'),
      () => cache.invalidate('KEY'),
      () => cache.clear(),
    ]) {
      rename.mockClear();
      await expect(operation()).rejects.toBe(error);
      expect(rename).toHaveBeenCalledTimes(attempts);
      expect(await cache.get('KEY')).toBe('original');
      expect(fs.readFileSync(testDbPath, 'utf-8')).toBe(before);
      expect(fs.readdirSync(path.dirname(testDbPath)).filter(f =>
        f.startsWith(`${path.basename(testDbPath)}.tmp.`))).toEqual([]);
    }
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to save store'));
    rename.mockRestore();
    await cache.set('KEY', 'recovered');
    expect(JSON.parse(fs.readFileSync(testDbPath, 'utf-8')).KEY.value).toBe('recovered');
  });

  it('一時ファイル書込み失敗でも旧データを保持して失敗を返す', async () => {
    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger);
    await cache.set('KEY', 'original');
    const before = fs.readFileSync(testDbPath, 'utf-8');
    const error = Object.assign(new Error('disk full'), { code: 'ENOSPC' });
    vi.spyOn(fs, 'writeFileSync').mockImplementationOnce(() => { throw error; });
    const rename = vi.spyOn(fs, 'renameSync');
    await expect(cache.set('KEY', 'changed')).rejects.toBe(error);
    expect(rename).not.toHaveBeenCalled();
    expect(await cache.get('KEY')).toBe('original');
    expect(fs.readFileSync(testDbPath, 'utf-8')).toBe(before);
  });

  it('保存が失敗しても取得済みメタデータは呼び出し側へ返る', async () => {
    const cache = new LiteDbCacheAdapter<ScrapedMetadata>(testDbPath, mockLogger);
    const metadata = { title: '取得済み' } as ScrapedMetadata;
    const inner = { execute: vi.fn().mockResolvedValue(metadata) };
    vi.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw Object.assign(new Error('locked'), { code: 'EPERM' });
    });
    const useCase = new CachingGetMetadataUseCase(inner, cache);
    expect(await useCase.execute('KEY')).toBe(metadata);
    expect(await cache.get('KEY')).toBeNull();
  });

  it('同時に依頼された保存も呼び出し順に完了する', async () => {
    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger);
    await Promise.all([cache.set('A', 'first'), cache.clear(), cache.set('B', 'last')]);
    expect(Object.keys(JSON.parse(fs.readFileSync(testDbPath, 'utf-8')))).toEqual(['B']);
    expect(await cache.get('A')).toBeNull();
    expect(await cache.get('B')).toBe('last');
  });

  it('アトミック保存により一時ファイルを書き込んでから本ファイルに rename されること', async () => {
    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger);
    await cache.set('ATOMIC-1', 'DATA-1');

    // 正常に本ファイルが存在し中身が正しいこと
    expect(fs.existsSync(testDbPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(testDbPath, 'utf-8'));
    expect(content['ATOMIC-1'].value).toBe('DATA-1');

    // 一時ファイル (.tmp) が残っていないこと
    const dir = path.dirname(testDbPath);
    const tempFiles = fs.readdirSync(dir).filter(f => f.includes('.tmp.'));
    expect(tempFiles.length).toBe(0);
  });
});

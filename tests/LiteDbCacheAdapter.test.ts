import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LiteDbCacheAdapter } from '../src/cache/LiteDbCacheAdapter';
import type { ILogger } from '../src/services/LoggingService';
import * as fs from 'fs';
import * as path from 'path';

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
    cleanupTestDb();
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as unknown as ILogger;
  });

  afterEach(() => {
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
    // expiresAt が約 24時間後 (+/- 2秒)
    const expectedExpires = Date.now() + 86400000;
    expect(item.expiresAt).toBeGreaterThan(expectedExpires - 2000);
    expect(item.expiresAt).toBeLessThanOrEqual(expectedExpires + 2000);
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

    // 20ms 待機
    await new Promise(resolve => setTimeout(resolve, 20));

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

  it('getStats で有効なエントリ数、maxEntries、defaultTtlMs を取得できること', async () => {
    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger, 86400000, 500);
    const initialStats = await cache.getStats();
    expect(initialStats).toEqual({
      count: 0,
      maxEntries: 500,
      defaultTtlMs: 86400000,
    });

    await cache.set('S1', 'V1');
    await cache.set('S2', 'V2');
    const updatedStats = await cache.getStats();
    expect(updatedStats.count).toBe(2);

    await cache.clear();
    const clearedStats = await cache.getStats();
    expect(clearedStats.count).toBe(0);
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

    // get 後に updatedAt が設定されて保存されていること
    const reloaded = JSON.parse(fs.readFileSync(testDbPath, 'utf-8'));
    expect(reloaded['LEGACY-001'].updatedAt).toBeDefined();
    expect(reloaded['LEGACY-001'].createdAt).toBeDefined();
  });

  it('最大件数 (maxEntries) 超過時に最も古い (LRU) エントリから自動削除されること', async () => {
    // maxEntries を 3 に設定して検証
    const cache = new LiteDbCacheAdapter<string>(testDbPath, mockLogger, 86400000, 3);

    await cache.set('ITEM-1', 'VAL-1');
    await new Promise(resolve => setTimeout(resolve, 20));
    await cache.set('ITEM-2', 'VAL-2');
    await new Promise(resolve => setTimeout(resolve, 20));
    await cache.set('ITEM-3', 'VAL-3');
    await new Promise(resolve => setTimeout(resolve, 20));

    // ITEM-1 にアクセスして updatedAt を最新にする
    await cache.get('ITEM-1');
    await new Promise(resolve => setTimeout(resolve, 20));

    // 4件目（ITEM-4）を追加 -> ITEM-2 が最古（ITEM-1はgetで更新、ITEM-3はsetがITEM-2より後）なので削除される
    await cache.set('ITEM-4', 'VAL-4');

    expect(await cache.get('ITEM-2')).toBeNull(); // 削除された
    expect(await cache.get('ITEM-1')).toBe('VAL-1'); // アクセスされたため保持
    expect(await cache.get('ITEM-3')).toBe('VAL-3'); // 保持
    expect(await cache.get('ITEM-4')).toBe('VAL-4'); // 保持

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Evicted LRU key: ITEM-2'));
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


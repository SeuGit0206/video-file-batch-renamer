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
});

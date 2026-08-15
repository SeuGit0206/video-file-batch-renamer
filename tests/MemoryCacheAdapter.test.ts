import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryCacheAdapter } from '../src/cache/MemoryCacheAdapter';
import type { ILogger } from '../src/services/LoggingService';

describe('MemoryCacheAdapter Test Suite', () => {
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as unknown as ILogger;
  });

  it('値をセットして正常に取得できること', async () => {
    const cache = new MemoryCacheAdapter<string>(mockLogger, 5000);
    await cache.set('KEY1', 'VALUE1');

    const result = await cache.get('KEY1');
    expect(result).toBe('VALUE1');
    expect(mockLogger.info).toHaveBeenCalledWith('[Cache] Hit for key: KEY1');
  });

  it('存在しないキーの取得時に null を返すこと', async () => {
    const cache = new MemoryCacheAdapter<string>(mockLogger, 5000);
    const result = await cache.get('UNKNOWN');

    expect(result).toBeNull();
    expect(mockLogger.info).toHaveBeenCalledWith('[Cache] Miss for key: UNKNOWN');
  });

  it('TTL 期限切れの場合に null を返しキャッシュから削除されること', async () => {
    const cache = new MemoryCacheAdapter<string>(mockLogger, 10); // 10ms
    await cache.set('EXPIRE_KEY', 'TEMP');

    // 20ms 待機
    await new Promise(resolve => setTimeout(resolve, 20));

    const result = await cache.get('EXPIRE_KEY');
    expect(result).toBeNull();
    expect(mockLogger.info).toHaveBeenCalledWith('[Cache] Expired for key: EXPIRE_KEY');
  });

  it('invalidate で特定キーが削除されること', async () => {
    const cache = new MemoryCacheAdapter<string>(mockLogger);
    await cache.set('DEL_KEY', 'VAL');
    await cache.invalidate('DEL_KEY');

    const result = await cache.get('DEL_KEY');
    expect(result).toBeNull();
  });

  it('clear で全キーが消去されること', async () => {
    const cache = new MemoryCacheAdapter<string>(mockLogger);
    await cache.set('K1', 'V1');
    await cache.set('K2', 'V2');
    await cache.clear();

    expect(await cache.get('K1')).toBeNull();
    expect(await cache.get('K2')).toBeNull();
  });
});

import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import {
  PerformanceProfiler,
  ResponseCacheService,
  ResponseCacheMiddleware,
  StreamOptimizer,
  MemoryOptimizer,
  BufferPool,
} from '../src/performance';

describe('Phase35 Performance & Response Caching Suite', () => {
  describe('PerformanceProfiler', () => {
    it('処理時間を計測し、正しい統計情報およびボトルネック分析を提供すること', async () => {
      const profiler = new PerformanceProfiler();

      await profiler.measure('db_query', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const stop = profiler.startTimer('http_request');
      await new Promise((resolve) => setTimeout(resolve, 50));
      stop();

      const stats = profiler.getStats();
      expect(stats.totalMeasurements).toBe(2);
      expect(stats.byName['db_query']).toBeDefined();
      expect(stats.byName['http_request']).toBeDefined();
      expect(stats.bottlenecks[0].name).toBe('http_request');
      expect(stats.p95DurationMs).toBeGreaterThan(0);
    });

    it('clear メソッドでデータがリセットされること', () => {
      const profiler = new PerformanceProfiler();
      profiler.record('test', 100);
      expect(profiler.getStats().totalMeasurements).toBe(1);

      profiler.clear();
      expect(profiler.getStats().totalMeasurements).toBe(0);
    });
  });

  describe('ResponseCacheService', () => {
    it('レスポンスのキャッシュ、ETag生成、TTL検証、304 判定が正しく行われること', () => {
      const cacheService = new ResponseCacheService({ defaultTtlMs: 1000 });
      const body = JSON.stringify({ title: 'Test AV', code: 'ABC-123' });

      const cached = cacheService.set('/api/metadata?id=ABC-123', body);
      expect(cached.eTag).toMatch(/^W\/"/);

      const retrieved = cacheService.get('/api/metadata?id=ABC-123');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.body).toBe(body);

      // 304 Freshness チェック
      expect(cacheService.isFresh(cached.eTag, undefined, cached)).toBe(true);
      expect(cacheService.isFresh('W/"invalid"', undefined, cached)).toBe(false);
    });

    it('容量上限に達した場合、最も古いエントリが Evict されること', () => {
      const cacheService = new ResponseCacheService({ maxItems: 2 });
      cacheService.set('key1', 'body1');
      cacheService.set('key2', 'body2');
      cacheService.set('key3', 'body3');

      expect(cacheService.get('key1')).toBeNull();
      expect(cacheService.get('key2')).not.toBeNull();
      expect(cacheService.get('key3')).not.toBeNull();
    });
  });

  describe('ResponseCacheMiddleware', () => {
    it('If-None-Match ヘッダーが合致した場合に 304 Not Modified を返すこと', () => {
      const cacheService = new ResponseCacheService();
      const middleware = new ResponseCacheMiddleware(cacheService);

      const body = 'cached response';
      const cached = cacheService.set('/api/test', body);

      const req = {
        method: 'GET',
        originalUrl: '/api/test',
        headers: { 'if-none-match': cached.eTag },
      } as unknown as Request;

      const setHeaderFn = vi.fn();
      const statusFn = vi.fn().mockReturnThis();
      const endFn = vi.fn();
      const res = { setHeader: setHeaderFn, status: statusFn, end: endFn } as unknown as Response;
      const next = vi.fn();

      middleware.handle()(req, res, next);

      expect(statusFn).toHaveBeenCalledWith(304);
      expect(endFn).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('StreamOptimizer', () => {
    it('JSON配列データを Readable ストリームに変換して Chunk 配信できること', async () => {
      const optimizer = new StreamOptimizer();
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const stream = optimizer.createChunkedStream(data, 2);
      const chunks: string[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk.toString());
      }

      const fullJson = chunks.join('');
      expect(JSON.parse(fullJson)).toEqual(data);
    });
  });

  describe('MemoryOptimizer', () => {
    it('メモリ使用量統計の取得、BufferPool による再利用、クリーンアップコールバックが正常動作すること', () => {
      const optimizer = new MemoryOptimizer();
      const stats = optimizer.getMemoryStats();

      expect(stats.heapUsedMB).toBeGreaterThan(0);
      expect(stats.heapTotalMB).toBeGreaterThan(0);

      // BufferPool のテスト
      const pool = new BufferPool(1024, 2);
      const buf1 = pool.acquire();
      expect(buf1.length).toBe(1024);

      pool.release(buf1);
      expect(pool.size()).toBe(1);

      const buf2 = pool.acquire();
      expect(pool.size()).toBe(0);
      expect(buf2).toBe(buf1); // 再利用確認

      // checkAndCleanMemory のテスト
      const cleanupCb = vi.fn();
      // 通常の限界値(10000MB)では発動しない
      const cleaned = optimizer.checkAndCleanMemory([cleanupCb], 10000);
      expect(cleaned).toBe(false);
      expect(cleanupCb).not.toHaveBeenCalled();

      // 超過閾値(0MB)で発動すること
      const forcedCleaned = optimizer.checkAndCleanMemory([cleanupCb], 0);
      expect(forcedCleaned).toBe(true);
      expect(cleanupCb).toHaveBeenCalledTimes(1);
    });
  });
});

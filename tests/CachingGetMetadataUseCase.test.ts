import { describe, it, expect, vi } from 'vitest';
import { CachingGetMetadataUseCase } from '../src/usecases/CachingGetMetadataUseCase';
import type { IGetMetadataUseCase } from '../src/usecases/GetMetadataUseCase';
import { MemoryCacheAdapter } from '../src/cache/MemoryCacheAdapter';
import type { ScrapedMetadata } from '../src/types';
import { NullMetricsCollector } from '../src/metrics/NullMetricsCollector';

describe('CachingGetMetadataUseCase Test Suite', () => {
  it('初回取得時は innerUseCase が実行され結果がキャッシュされること', async () => {
    const mockMetadata: ScrapedMetadata = {
      productId: 'SSIS-001',
      title: 'Test Title',
      actress: 'Test Actress',
      releaseDate: '2026-01-01',
      series: 'Test Series',
      maker: 'Test Maker'
    };

    const executeSpy = vi.fn().mockResolvedValue(mockMetadata);
    const mockInnerUseCase: IGetMetadataUseCase = {
      execute: executeSpy
    };

    const cacheAdapter = new MemoryCacheAdapter<ScrapedMetadata>();
    const cachingUseCase = new CachingGetMetadataUseCase(mockInnerUseCase, cacheAdapter);

    // 1回目の呼び出し（キャッシュミス）
    const result1 = await cachingUseCase.execute('ssis-001');
    expect(result1).toEqual(mockMetadata);
    expect(executeSpy).toHaveBeenCalledTimes(1);

    // 2回目の呼び出し（キャッシュヒット）
    const result2 = await cachingUseCase.execute('ssis-001');
    expect(result2).toEqual(mockMetadata);
    // innerUseCase は追加実行されていないこと
    expect(executeSpy).toHaveBeenCalledTimes(1);
  });

  it('同一キーへの同時リクエストが In-Flight Single-Flight により 1 回の innerUseCase 呼び出しに集約されること', async () => {
    const mockMetadata: ScrapedMetadata = {
      productId: 'SSIS-COALESCE',
      title: 'Coalesce Title',
    };

    let resolvePromise: (value: ScrapedMetadata) => void;
    const delayedPromise = new Promise<ScrapedMetadata>((resolve) => {
      resolvePromise = resolve;
    });

    const executeSpy = vi.fn().mockImplementation(() => delayedPromise);
    const mockInnerUseCase: IGetMetadataUseCase = { execute: executeSpy };
    const cacheAdapter = new MemoryCacheAdapter<ScrapedMetadata>();

    const cachingUseCase = new CachingGetMetadataUseCase(mockInnerUseCase, cacheAdapter);

    // 同一キーに対して 3 つのリクエストをほぼ同時に発行
    const req1 = cachingUseCase.execute('SSIS-COALESCE');
    const req2 = cachingUseCase.execute('ssis-coalesce'); // 大文字小文字正規化後同一
    const req3 = cachingUseCase.execute('  SSIS-COALESCE  ');

    // 遅延解決
    resolvePromise!(mockMetadata);

    const [res1, res2, res3] = await Promise.all([req1, req2, req3]);
    expect(res1).toEqual(mockMetadata);
    expect(res2).toEqual(mockMetadata);
    expect(res3).toEqual(mockMetadata);
    // 3 つのリクエストに対して innerUseCase は 1 回のみ実行されたこと
    expect(executeSpy).toHaveBeenCalledTimes(1);

    // 完了後はキャッシュに保存され、In-Flight も解除されている
    const cachedItem = await cacheAdapter.get('SSIS-COALESCE');
    expect(cachedItem).toEqual(mockMetadata);
  });

  it('異なるキーへの同時リクエストは独立して並行実行されること', async () => {
    const metaA: ScrapedMetadata = { productId: 'KEY-A', title: 'Title A' };
    const metaB: ScrapedMetadata = { productId: 'KEY-B', title: 'Title B' };

    const executeSpy = vi.fn().mockImplementation((id: string) => {
      if (id === 'key-a') return Promise.resolve(metaA);
      if (id === 'key-b') return Promise.resolve(metaB);
      return Promise.reject(new Error('Unknown ID'));
    });

    const mockInnerUseCase: IGetMetadataUseCase = { execute: executeSpy };
    const cacheAdapter = new MemoryCacheAdapter<ScrapedMetadata>();
    const cachingUseCase = new CachingGetMetadataUseCase(mockInnerUseCase, cacheAdapter);

    const [resA, resB] = await Promise.all([
      cachingUseCase.execute('key-a'),
      cachingUseCase.execute('key-b')
    ]);

    expect(resA).toEqual(metaA);
    expect(resB).toEqual(metaB);
    expect(executeSpy).toHaveBeenCalledTimes(2);
  });

  it('innerUseCase が失敗した場合、エラーはキャッシュされず In-Flight Map が解除され次回再試行できること', async () => {
    const errorExecuteSpy = vi.fn()
      .mockRejectedValueOnce(new Error('Scraping 404 Not Found'))
      .mockResolvedValueOnce({ productId: 'RETRY-001', title: 'Recovered' });

    const mockInnerUseCase: IGetMetadataUseCase = { execute: errorExecuteSpy };
    const cacheAdapter = new MemoryCacheAdapter<ScrapedMetadata>();
    const cachingUseCase = new CachingGetMetadataUseCase(mockInnerUseCase, cacheAdapter);

    // 1回目：エラー発生
    await expect(cachingUseCase.execute('RETRY-001')).rejects.toThrow('Scraping 404 Not Found');

    // キャッシュには保存されていないこと
    const cached = await cacheAdapter.get('RETRY-001');
    expect(cached).toBeNull();

    // 2回目：再試行して成功すること（In-Flight Map に残留していないことの証明）
    const successResult = await cachingUseCase.execute('RETRY-001');
    expect(successResult).toEqual({ productId: 'RETRY-001', title: 'Recovered' });
    expect(errorExecuteSpy).toHaveBeenCalledTimes(2);
  });

  it('cacheAdapter.get() が例外をスローした場合、フォールバックして innerUseCase が実行されること', async () => {
    const mockMetadata: ScrapedMetadata = {
      productId: 'SSIS-002',
      title: 'Fallback Title',
    };

    const executeSpy = vi.fn().mockResolvedValue(mockMetadata);
    const mockInnerUseCase: IGetMetadataUseCase = { execute: executeSpy };

    const failingCacheAdapter = {
      get: vi.fn().mockRejectedValue(new Error('Cache read storage failure')),
      set: vi.fn().mockResolvedValue(undefined),
      invalidate: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    };

    class TestMetricsCollector extends NullMetricsCollector {
      public override recordCacheMiss = vi.fn();
    }
    const mockMetricsCollector = new TestMetricsCollector();

    const cachingUseCase = new CachingGetMetadataUseCase(
      mockInnerUseCase,
      failingCacheAdapter,
      mockMetricsCollector
    );

    const result = await cachingUseCase.execute('SSIS-002');
    expect(result).toEqual(mockMetadata);
    expect(executeSpy).toHaveBeenCalledWith('SSIS-002');
    expect(mockMetricsCollector.recordCacheMiss).toHaveBeenCalledTimes(1);
  });

  it('cacheAdapter.set() が例外をスローした場合でも、メタデータが正常に返却されること', async () => {
    const mockMetadata: ScrapedMetadata = {
      productId: 'SSIS-003',
      title: 'Set Fail Title',
    };

    const executeSpy = vi.fn().mockResolvedValue(mockMetadata);
    const mockInnerUseCase: IGetMetadataUseCase = { execute: executeSpy };

    const failingSetCacheAdapter = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockRejectedValue(new Error('Cache write storage failure')),
      invalidate: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    };

    const cachingUseCase = new CachingGetMetadataUseCase(mockInnerUseCase, failingSetCacheAdapter);

    const result = await cachingUseCase.execute('SSIS-003');
    expect(result).toEqual(mockMetadata);
    expect(executeSpy).toHaveBeenCalledWith('SSIS-003');
  });

  it('productId の前後空白が正規化されて innerUseCase および Cache に渡されること', async () => {
    const mockMetadata: ScrapedMetadata = {
      productId: 'SSIS-004',
      title: 'Trimmed Title',
    };

    const executeSpy = vi.fn().mockResolvedValue(mockMetadata);
    const mockInnerUseCase: IGetMetadataUseCase = { execute: executeSpy };
    const cacheAdapter = new MemoryCacheAdapter<ScrapedMetadata>();

    class TestMetricsCollector extends NullMetricsCollector {
      public override recordCacheHit = vi.fn();
      public override recordCacheMiss = vi.fn();
    }
    const mockMetricsCollector = new TestMetricsCollector();

    const cachingUseCase = new CachingGetMetadataUseCase(
      mockInnerUseCase,
      cacheAdapter,
      mockMetricsCollector
    );

    const result = await cachingUseCase.execute('   ssis-004   ');
    expect(result).toEqual(mockMetadata);
    expect(executeSpy).toHaveBeenCalledWith('ssis-004');
    expect(mockMetricsCollector.recordCacheMiss).toHaveBeenCalledTimes(1);

    // 2回目：前後の空白なしで検索してもキャッシュにヒットすること
    const result2 = await cachingUseCase.execute('SSIS-004');
    expect(result2).toEqual(mockMetadata);
    expect(mockMetricsCollector.recordCacheHit).toHaveBeenCalledTimes(1);
  });
});


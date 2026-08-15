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

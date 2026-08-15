import type { IGetMetadataUseCase } from './GetMetadataUseCase';
import type { ScrapedMetadata } from '../types';
import type { ICacheAdapter } from '../cache/ICacheAdapter';
import type { IMetricsCollector } from '../metrics/IMetricsCollector';
import { NullMetricsCollector } from '../metrics/NullMetricsCollector';

/**
 * キャッシュ機能でラッピングされた IGetMetadataUseCase デコレーター
 */
export class CachingGetMetadataUseCase implements IGetMetadataUseCase {
  constructor(
    private innerUseCase: IGetMetadataUseCase,
    private cacheAdapter: ICacheAdapter<ScrapedMetadata>,
    private metricsCollector: IMetricsCollector = new NullMetricsCollector()
  ) {}

  public async execute(productId: string): Promise<ScrapedMetadata> {
    const normalizedProductId = (productId || '').trim();
    const cacheKey = normalizedProductId.toUpperCase();

    let cached: ScrapedMetadata | null = null;
    try {
      cached = await this.cacheAdapter.get(cacheKey);
    } catch {
      // キャッシュ読込障害時はフォールバック（Cache Miss扱い）
      cached = null;
    }

    if (cached) {
      this.metricsCollector.recordCacheHit();
      return cached;
    }

    this.metricsCollector.recordCacheMiss();
    const metadata = await this.innerUseCase.execute(normalizedProductId);

    if (metadata) {
      try {
        await this.cacheAdapter.set(cacheKey, metadata);
      } catch {
        // キャッシュ保存障害時も取得済みメタデータを正常に返却
      }
    }

    return metadata;
  }
}

import type { IGetMetadataUseCase } from './GetMetadataUseCase';
import type { ScrapedMetadata } from '../types';
import type { ICacheAdapter } from '../cache/ICacheAdapter';
import type { IMetricsCollector } from '../metrics/IMetricsCollector';
import { NullMetricsCollector } from '../metrics/NullMetricsCollector';

/**
 * キャッシュ機能および同一キー重複スクレイピング防止（In-Flight Single-Flight）で
 * ラッピングされた IGetMetadataUseCase デコレーター
 */
export class CachingGetMetadataUseCase implements IGetMetadataUseCase {
  private inFlightRequests: Map<string, Promise<ScrapedMetadata>> = new Map();

  constructor(
    private innerUseCase: IGetMetadataUseCase,
    private cacheAdapter: ICacheAdapter<ScrapedMetadata>,
    private metricsCollector: IMetricsCollector = new NullMetricsCollector()
  ) {}

  public async execute(productId: string): Promise<ScrapedMetadata> {
    const normalizedProductId = (productId || '').trim();
    const cacheKey = normalizedProductId.toUpperCase();

    // 同一キーに対する処理が既に進行中の場合は、その Promise を共有 (Single-Flight)
    const existingInFlight = this.inFlightRequests.get(cacheKey);
    if (existingInFlight) {
      return existingInFlight;
    }

    const processPromise = (async () => {
      try {
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
      } finally {
        // 成功・失敗にかかわらず In-Flight 管理から確実に削除
        this.inFlightRequests.delete(cacheKey);
      }
    })();

    this.inFlightRequests.set(cacheKey, processPromise);
    return processPromise;
  }
}



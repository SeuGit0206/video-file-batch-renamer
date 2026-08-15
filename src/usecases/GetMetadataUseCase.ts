import type { ScrapedMetadata } from '../types';
import { ScrapingOrchestrator } from '../orchestrators';

/**
 * メタデータ取得 UseCase インターフェース
 */
export interface IGetMetadataUseCase {
  execute(productId: string): Promise<ScrapedMetadata>;
}

export type FetchMetadataFn = (productId: string) => Promise<ScrapedMetadata>;

/**
 * メタデータ取得業務フロー（UseCase）クラス
 */
export class GetMetadataUseCase implements IGetMetadataUseCase {
  private orchestratorFetch: FetchMetadataFn;

  constructor(orchestratorFetch?: FetchMetadataFn) {
    this.orchestratorFetch = orchestratorFetch || ScrapingOrchestrator.fetchMissAVMetadata;
  }

  /**
   * 指定した ProductId のメタデータを取得します
   */
  public async execute(productId: string): Promise<ScrapedMetadata> {
    return await this.orchestratorFetch(productId);
  }
}

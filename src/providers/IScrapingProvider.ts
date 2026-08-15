import type { IScrapingStep } from '../steps/IScrapingStep';

/**
 * サイト別スクレイピングプロバイダー (SiteAdapter) インターフェース
 */
export interface IScrapingProvider {
  readonly name: string;
  canHandle(productId: string): boolean;
  createPipeline(): IScrapingStep[];
  getBaseUrl(): string;
}

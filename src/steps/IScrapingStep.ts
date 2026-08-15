import type { ScrapingContext } from './ScrapingContext';

/**
 * スクレイピングステップ インターフェース
 */
export interface IScrapingStep {
  execute(context: ScrapingContext): Promise<void>;
}

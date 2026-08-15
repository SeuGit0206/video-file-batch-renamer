import { BaseAppError } from './BaseAppError';
import type { ScraperDebugInfo } from '../types';

export interface ScraperErrorOptions extends ErrorOptions {
  status?: number;
  debug?: ScraperDebugInfo;
}

/**
 * スクレイピング処理時のカスタムエラークラス
 */
export class ScraperError extends BaseAppError {
  public status?: number;
  public debug?: ScraperDebugInfo;

  constructor(message: string, options?: ScraperErrorOptions) {
    super(message, undefined, options);
    this.status = options?.status;
    this.debug = options?.debug;
  }
}

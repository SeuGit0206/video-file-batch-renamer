import { BaseAppError } from './BaseAppError';
import type { AppErrorCode, AppErrorDetails } from './AppErrorCodes';
import type { ScraperDebugInfo } from '../types';

export interface ScraperErrorOptions extends ErrorOptions {
  status?: number;
  code?: AppErrorCode;
  details?: AppErrorDetails;
  debug?: ScraperDebugInfo;
}

/**
 * スクレイピング処理時のカスタムエラークラス
 */
export class ScraperError extends BaseAppError {
  public status?: number;
  public code?: AppErrorCode;
  public debug?: ScraperDebugInfo;

  constructor(message: string, options?: ScraperErrorOptions) {
    super(message, options?.details, options);
    this.status = options?.status;
    this.code = options?.code;
    this.debug = options?.debug;
  }
}

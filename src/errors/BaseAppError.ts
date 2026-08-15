import type { AppErrorDetails } from './AppErrorCodes';

/**
 * アプリケーション共通のベースエラークラス
 */
export abstract class BaseAppError extends Error {
  public readonly details?: AppErrorDetails;

  constructor(message: string, details?: AppErrorDetails, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

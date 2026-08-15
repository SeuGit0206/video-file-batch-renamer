import { BaseAppError } from './BaseAppError';

/**
 * Playwrightブラウザ未インストールを示すエラークラス
 */
export class BrowserMissingError extends BaseAppError {
  public readonly isBrowserMissing: boolean = true;

  constructor(message: string, options?: ErrorOptions) {
    super(message, undefined, options);
  }
}

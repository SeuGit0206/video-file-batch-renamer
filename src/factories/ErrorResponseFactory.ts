import type { ScraperDebugInfo } from '../types';
import { getErrorMessage, isScraperCustomError } from '../types';
import { HTTP_STATUS, MISSAV_JA_BASE_URL } from '../constants';
import { AppErrorCode } from '../errors/AppErrorCodes';

export interface ErrorResponseBody {
  error: string;
  details: string;
  status: number;
  errorCode?: string;
  debug: ScraperDebugInfo;
}

export interface ErrorResponseResult {
  statusCode: number;
  body: ErrorResponseBody;
}

export interface IErrorResponseFactory {
  createErrorResponse(error: unknown, productId: string): ErrorResponseResult;
  create404ErrorResponse(productId: string, message?: string, debugInfo?: Partial<ScraperDebugInfo>): ErrorResponseBody;
  create500ErrorResponse(productId: string, message?: string, debugInfo?: Partial<ScraperDebugInfo>): ErrorResponseBody;
}

/**
 * エラーレスポンスおよびデバッグ情報の生成を担うファクトリクラス
 */
export class ErrorResponseFactory implements IErrorResponseFactory {
  /**
   * 投げられた例外オブジェクトと productId から適切なエラーレスポンス構造を生成します
   */
  public createErrorResponse(error: unknown, productId: string): ErrorResponseResult {
    const errMessage = getErrorMessage(error);
    const statusCode =
      isScraperCustomError(error) && typeof error.status === 'number'
        ? error.status
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const customDebug = isScraperCustomError(error) ? error.debug : undefined;
    const errorCode = (error && typeof error === 'object' && 'code' in error && typeof (error as Record<string, unknown>).code === 'string')
      ? (error as Record<string, unknown>).code as string
      : (statusCode === HTTP_STATUS.NOT_FOUND ? AppErrorCode.METADATA_NOT_FOUND : undefined);

    const debug: ScraperDebugInfo =
      (customDebug as ScraperDebugInfo) || this.createDefaultDebugInfo(productId, errMessage, statusCode);

    return {
      statusCode,
      body: {
        error: errMessage,
        details: errMessage,
        status: statusCode,
        ...(errorCode ? { errorCode } : {}),
        debug,
      },
    };
  }

  /**
   * 404 Not Found 用のエラーレスポンスを生成します
   */
  public create404ErrorResponse(
    productId: string,
    message = 'Not Found',
    debugInfo?: Partial<ScraperDebugInfo>
  ): ErrorResponseBody {
    return {
      error: message,
      details: message,
      status: HTTP_STATUS.NOT_FOUND,
      errorCode: AppErrorCode.METADATA_NOT_FOUND,
      debug: {
        ...this.createDefaultDebugInfo(productId, message, HTTP_STATUS.NOT_FOUND),
        ...debugInfo,
      },
    };
  }

  /**
   * 500 Internal Server Error 用のエラーレスポンスを生成します
   */
  public create500ErrorResponse(
    productId: string,
    message = 'Internal Server Error',
    debugInfo?: Partial<ScraperDebugInfo>
  ): ErrorResponseBody {
    return {
      error: message,
      details: message,
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      debug: {
        ...this.createDefaultDebugInfo(productId, message, HTTP_STATUS.INTERNAL_SERVER_ERROR),
        ...debugInfo,
      },
    };
  }

  /**
   * デフォルトの ScraperDebugInfo オブジェクトを生成します
   */
  private createDefaultDebugInfo(productId: string, errMessage: string, statusCode: number): ScraperDebugInfo {
    return {
      finalUrl: `${MISSAV_JA_BASE_URL}/${productId.toLowerCase()}`,
      pageTitle: 'Scraping Failed',
      htmlLength: 0,
      htmlPreview: errMessage,
      bodyPreview: errMessage,
      status: statusCode,
    };
  }
}

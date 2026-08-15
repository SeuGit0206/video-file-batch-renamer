import type { Request, Response, NextFunction } from 'express';
import type { ISecurityHeadersProvider, IHeaderSanitizer, IOutputSanitizer } from '../security';
import { SecurityHeadersProvider, HeaderSanitizer, OutputSanitizer } from '../security';

export interface SecurityMiddlewareOptions {
  maxPayloadSizeBytes?: number; // 例: 1MB = 1048576
}

export class SecurityMiddleware {
  private securityHeadersProvider: ISecurityHeadersProvider;
  private headerSanitizer: IHeaderSanitizer;
  private outputSanitizer: IOutputSanitizer;
  private maxPayloadSizeBytes: number;

  constructor(
    securityHeadersProvider?: ISecurityHeadersProvider,
    headerSanitizer?: IHeaderSanitizer,
    outputSanitizer?: IOutputSanitizer,
    options?: SecurityMiddlewareOptions
  ) {
    this.securityHeadersProvider = securityHeadersProvider || new SecurityHeadersProvider();
    this.headerSanitizer = headerSanitizer || new HeaderSanitizer();
    this.outputSanitizer = outputSanitizer || new OutputSanitizer();
    this.maxPayloadSizeBytes = options?.maxPayloadSizeBytes || 1024 * 1024; // Default 1MB
  }

  /**
   * セキュリティヘッダー設定 & ヘッダーサニタイズミドルウェア
   */
  public applySecurityHeaders() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // 1. レスポンスセキュリティヘッダーを付与
      this.securityHeadersProvider.applyHeaders(res);

      // 2. リクエストヘッダーのCRLFサニタイズ
      if (req.headers) {
        for (const [key, val] of Object.entries(req.headers)) {
          if (typeof val === 'string') {
            req.headers[key] = this.headerSanitizer.sanitizeHeaderValue(val);
          }
        }
      }

      next();
    };
  }

  /**
   * ペイロードサイズ制限チェック (Request Size Limit) ミドルウェア
   */
  public enforcePayloadLimit() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const contentLengthHeader = req?.headers?.['content-length'];
      if (contentLengthHeader) {
        const contentLength = parseInt(contentLengthHeader, 10);
        if (!isNaN(contentLength) && contentLength > this.maxPayloadSizeBytes) {
          res.status(413).json({
            error: {
              code: 'PAYLOAD_TOO_LARGE',
              message: `Payload size exceeds maximum allowed limit of ${this.maxPayloadSizeBytes} bytes`,
            },
          });
          return;
        }
      }
      next();
    };
  }

  /**
   * 出力レスポンスサニタイズ補助（必要に応じて）
   */
  public getOutputSanitizer(): IOutputSanitizer {
    return this.outputSanitizer;
  }
}

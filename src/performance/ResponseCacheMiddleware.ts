import type { Request, Response, NextFunction } from 'express';
import type { IResponseCacheService } from './ResponseCacheService';

export interface ResponseCacheMiddlewareOptions {
  cacheControlHeader?: string;
}

export class ResponseCacheMiddleware {
  private cacheService: IResponseCacheService;
  private cacheControlHeader: string;

  constructor(cacheService: IResponseCacheService, options?: ResponseCacheMiddlewareOptions) {
    this.cacheService = cacheService;
    this.cacheControlHeader = options?.cacheControlHeader || 'public, max-age=300, must-revalidate';
  }

  public handle() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // GET リクエストのみキャッシュ対象とする
      if (req.method !== 'GET') {
        next();
        return;
      }

      const cacheKey = req.originalUrl || req.url;
      const cached = this.cacheService.get(cacheKey);

      const clientETag = req.headers['if-none-match'] as string | undefined;
      const clientModifiedSince = req.headers['if-modified-since'] as string | undefined;

      if (cached) {
        // ETag / If-None-Match または If-Modified-Since による 304 チェック
        if (this.cacheService.isFresh(clientETag, clientModifiedSince, cached)) {
          res.setHeader('ETag', cached.eTag);
          res.setHeader('Last-Modified', cached.lastModified);
          res.setHeader('Cache-Control', this.cacheControlHeader);
          res.status(304).end();
          return;
        }

        res.setHeader('ETag', cached.eTag);
        res.setHeader('Last-Modified', cached.lastModified);
        res.setHeader('Cache-Control', this.cacheControlHeader);
        res.setHeader('Content-Type', cached.contentType);
        res.status(200).send(cached.body);
        return;
      }

      // レスポンス送信をフックして自動キャッシュ設定
      const originalSend = res.send.bind(res);
      res.send = (body: unknown): Response => {
        if (res.statusCode === 200 && (typeof body === 'string' || Buffer.isBuffer(body))) {
          const contentType = (res.getHeader('Content-Type') as string) || 'application/json; charset=utf-8';
          const cachedItem = this.cacheService.set(cacheKey, body, contentType);

          res.setHeader('ETag', cachedItem.eTag);
          res.setHeader('Last-Modified', cachedItem.lastModified);
          res.setHeader('Cache-Control', this.cacheControlHeader);
        }
        return originalSend(body);
      };

      next();
    };
  }
}

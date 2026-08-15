import type { RequestHandler } from 'express';
import compression from 'compression';

export interface CompressionOptions {
  thresholdBytes?: number;
  level?: number;
}

export class CompressionMiddleware {
  public static create(options?: CompressionOptions): RequestHandler {
    const threshold = options?.thresholdBytes ?? 1024; // 1KB未満は圧縮しない
    const level = options?.level ?? 6;

    return compression({
      threshold,
      level,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
    });
  }
}

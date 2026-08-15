import crypto from 'crypto';

export interface CachedResponse {
  body: string | Buffer;
  contentType: string;
  eTag: string;
  lastModified: string;
  createdAt: number;
  ttlMs: number;
}

export interface ResponseCacheOptions {
  defaultTtlMs?: number;
  maxItems?: number;
}

export interface IResponseCacheService {
  get(key: string): CachedResponse | null;
  set(key: string, body: string | Buffer, contentType?: string, ttlMs?: number): CachedResponse;
  generateETag(body: string | Buffer): string;
  isFresh(clientETag?: string, clientModifiedSince?: string, cached?: CachedResponse): boolean;
  clear(): void;
  size(): number;
  evictExpired(): void;
}

export class ResponseCacheService implements IResponseCacheService {
  private cache = new Map<string, CachedResponse>();
  private defaultTtlMs: number;
  private maxItems: number;

  constructor(options?: ResponseCacheOptions) {
    this.defaultTtlMs = options?.defaultTtlMs ?? 5 * 60 * 1000; // 5 minutes
    this.maxItems = options?.maxItems ?? 200;
  }

  public get(key: string): CachedResponse | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    const now = Date.now();
    if (now - item.createdAt > item.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return item;
  }

  public set(
    key: string,
    body: string | Buffer,
    contentType: string = 'application/json; charset=utf-8',
    ttlMs?: number
  ): CachedResponse {
    this.evictExpired();

    if (this.cache.size >= this.maxItems) {
      // LRU/FIFO 的に最も古いエントリを削除
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const eTag = this.generateETag(body);
    const lastModified = new Date().toUTCString();
    const effectiveTtl = ttlMs ?? this.defaultTtlMs;

    const cachedResponse: CachedResponse = {
      body,
      contentType,
      eTag,
      lastModified,
      createdAt: Date.now(),
      ttlMs: effectiveTtl,
    };

    this.cache.set(key, cachedResponse);
    return cachedResponse;
  }

  public generateETag(body: string | Buffer): string {
    const hash = crypto.createHash('sha1').update(body).digest('hex').substring(0, 16);
    return `W/"${hash}"`;
  }

  public isFresh(clientETag?: string, clientModifiedSince?: string, cached?: CachedResponse): boolean {
    if (!cached) {
      return false;
    }

    if (clientETag && clientETag === cached.eTag) {
      return true;
    }

    if (clientModifiedSince) {
      const clientTime = new Date(clientModifiedSince).getTime();
      const cachedTime = new Date(cached.lastModified).getTime();
      if (!isNaN(clientTime) && clientTime >= cachedTime) {
        return true;
      }
    }

    return false;
  }

  public evictExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.createdAt > item.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

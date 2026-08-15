import type { ICacheAdapter } from './ICacheAdapter';
import type { ILogger } from '../services/LoggingService';

interface CacheItem<T> {
  value: T;
  expiresAt: number | null;
}

export class MemoryCacheAdapter<T = unknown> implements ICacheAdapter<T> {
  private store = new Map<string, CacheItem<T>>();

  constructor(
    private logger?: ILogger,
    private defaultTtlMs: number = 300000 // デフォルト 5分 (300,000ms)
  ) {}

  public async get(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) {
      if (this.logger) {
        this.logger.info(`[Cache] Miss for key: ${key}`);
      }
      return null;
    }

    if (item.expiresAt !== null && Date.now() > item.expiresAt) {
      this.store.delete(key);
      if (this.logger) {
        this.logger.info(`[Cache] Expired for key: ${key}`);
      }
      return null;
    }

    if (this.logger) {
      this.logger.info(`[Cache] Hit for key: ${key}`);
    }
    return item.value;
  }

  public async set(key: string, value: T, ttlMs?: number): Promise<void> {
    const effectiveTtl = ttlMs !== undefined ? ttlMs : this.defaultTtlMs;
    const expiresAt = effectiveTtl > 0 ? Date.now() + effectiveTtl : null;

    this.store.set(key, { value, expiresAt });
    if (this.logger) {
      this.logger.info(`[Cache] Set key: ${key} (TTL: ${effectiveTtl}ms)`);
    }
  }

  public async invalidate(key: string): Promise<void> {
    this.store.delete(key);
    if (this.logger) {
      this.logger.info(`[Cache] Invalidated key: ${key}`);
    }
  }

  public async clear(): Promise<void> {
    this.store.clear();
    if (this.logger) {
      this.logger.info(`[Cache] Cleared all keys`);
    }
  }
}

import type { ICacheAdapter } from './ICacheAdapter';
import type { ILogger } from '../services/LoggingService';
import * as fs from 'fs';
import * as path from 'path';

interface CacheEnvelope<T> {
  value: T;
  expiresAt: number | null;
}

interface CacheStorageSchema<T> {
  [key: string]: CacheEnvelope<T>;
}

export class LiteDbCacheAdapter<T = unknown> implements ICacheAdapter<T> {
  private filePath: string;

  constructor(
    filePath: string = path.join(process.cwd(), 'data', 'cache-db.json'),
    private logger?: ILogger,
    private defaultTtlMs: number = 300000 // 5分
  ) {
    this.filePath = filePath;
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      if (this.logger) {
        this.logger.error(`[LiteDbCache] Failed to create directory: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  private loadStore(): CacheStorageSchema<T> {
    try {
      if (!fs.existsSync(this.filePath)) {
        return {};
      }
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      if (!raw || raw.trim() === '') {
        return {};
      }
      return JSON.parse(raw) as CacheStorageSchema<T>;
    } catch (err) {
      if (this.logger) {
        this.logger.error(`[LiteDbCache] Failed to load store: ${err instanceof Error ? err.message : String(err)}`);
      }
      return {};
    }
  }

  private saveStore(store: CacheStorageSchema<T>): void {
    try {
      this.ensureDirectoryExists();
      const raw = JSON.stringify(store, null, 2);
      fs.writeFileSync(this.filePath, raw, 'utf-8');
    } catch (err) {
      if (this.logger) {
        this.logger.error(`[LiteDbCache] Failed to save store: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  public async get(key: string): Promise<T | null> {
    const normKey = (key || '').trim().toUpperCase();
    const store = this.loadStore();
    const item = store[normKey];

    if (!item) {
      if (this.logger) {
        this.logger.info(`[LiteDbCache] Miss for key: ${normKey}`);
      }
      return null;
    }

    if (item.expiresAt !== null && Date.now() > item.expiresAt) {
      delete store[normKey];
      this.saveStore(store);
      if (this.logger) {
        this.logger.info(`[LiteDbCache] Expired for key: ${normKey}`);
      }
      return null;
    }

    if (this.logger) {
      this.logger.info(`[LiteDbCache] Hit for key: ${normKey}`);
    }
    return item.value;
  }

  public async set(key: string, value: T, ttlMs?: number): Promise<void> {
    const normKey = (key || '').trim().toUpperCase();
    const effectiveTtl = ttlMs !== undefined ? ttlMs : this.defaultTtlMs;
    const expiresAt = effectiveTtl > 0 ? Date.now() + effectiveTtl : null;

    const store = this.loadStore();
    store[normKey] = { value, expiresAt };
    this.saveStore(store);

    if (this.logger) {
      this.logger.info(`[LiteDbCache] Set key: ${normKey} (TTL: ${effectiveTtl}ms)`);
    }
  }

  public async invalidate(key: string): Promise<void> {
    const normKey = (key || '').trim().toUpperCase();
    const store = this.loadStore();
    if (store[normKey]) {
      delete store[normKey];
      this.saveStore(store);
      if (this.logger) {
        this.logger.info(`[LiteDbCache] Invalidated key: ${normKey}`);
      }
    }
  }

  public async clear(): Promise<void> {
    this.saveStore({});
    if (this.logger) {
      this.logger.info(`[LiteDbCache] Cleared all keys`);
    }
  }
}

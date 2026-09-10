import type { ICacheAdapter, ICacheStats } from './ICacheAdapter';
import type { ILogger } from '../services/LoggingService';
import * as fs from 'fs';
import * as path from 'path';

interface CacheEnvelope<T> {
  value: T;
  expiresAt: number | null;
  createdAt?: number;
  updatedAt?: number;
}

interface CacheStorageSchema<T> {
  [key: string]: CacheEnvelope<T>;
}

// 1ファイルにつき1インスタンス・1プロセスで使用する。外部の更新は再読込しない。
export class LiteDbCacheAdapter<T = unknown> implements ICacheAdapter<T> {
  private filePath: string;

  private inMemoryStore: CacheStorageSchema<T> | null = null;

  constructor(
    filePath: string = path.join(process.cwd(), 'data', 'cache-db.json'),
    private logger?: ILogger,
    private defaultTtlMs: number = 86400000, // 24時間 (24 * 60 * 60 * 1000)
    private maxEntries: number = 500
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
    if (this.inMemoryStore !== null) {
      return this.inMemoryStore;
    }

    try {
      if (!fs.existsSync(this.filePath)) {
        this.inMemoryStore = {};
        return this.inMemoryStore;
      }
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      if (!raw || raw.trim() === '') {
        this.inMemoryStore = {};
        return this.inMemoryStore;
      }
      const parsed = JSON.parse(raw) as CacheStorageSchema<T>;
      const now = Date.now();
      // 旧形式データの互換性担保 (createdAt / updatedAt がない場合の補正)
      for (const key of Object.keys(parsed)) {
        const item = parsed[key];
        if (item) {
          if (typeof item.createdAt !== 'number') {
            item.createdAt = now;
          }
          if (typeof item.updatedAt !== 'number') {
            item.updatedAt = now;
          }
        }
      }
      this.inMemoryStore = parsed;
      return this.inMemoryStore;
    } catch (err) {
      if (this.logger) {
        this.logger.error(`[LiteDbCache] Failed to load store: ${err instanceof Error ? err.message : String(err)}`);
      }
      this.inMemoryStore = {};
      return this.inMemoryStore;
    }
  }

  private saveStore(store: CacheStorageSchema<T>): void {
    const tempPath = `${this.filePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2)}`;
    try {
      this.ensureDirectoryExists();
      const raw = JSON.stringify(store, null, 2);
      fs.writeFileSync(tempPath, raw, 'utf-8');

      // 一時的な置換失敗だけを最大3回試す。待機や非同期化を挟まず保存順序を保つ。
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          fs.renameSync(tempPath, this.filePath);
          this.inMemoryStore = store;
          return;
        } catch (renameErr) {
          const code = (renameErr as NodeJS.ErrnoException).code;
          if ((code !== 'EBUSY' && code !== 'EPERM') || attempt === 2) {
            throw renameErr;
          }
        }
      }
    } catch (err) {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch {
        // ignore cleanup error
      }
      if (this.logger) {
        this.logger.error(`[LiteDbCache] Failed to save store: ${err instanceof Error ? err.message : String(err)}`);
      }
      throw err;
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

    const now = Date.now();
    if (item.expiresAt !== null && now > item.expiresAt) {
      delete store[normKey];
      // 次の保存成功時に削除を永続化。再起動後も expiresAt を判定するので値は返さない。
      if (this.logger) {
        this.logger.info(`[LiteDbCache] Expired for key: ${normKey}`);
      }
      return null;
    }

    // 次の保存成功までメモリのみ更新。再起動時は最後に保存されたアクセス時刻を使う。
    item.updatedAt = now;

    if (this.logger) {
      this.logger.info(`[LiteDbCache] Hit for key: ${normKey}`);
    }
    return item.value;
  }

  public async set(key: string, value: T, ttlMs?: number): Promise<void> {
    const normKey = (key || '').trim().toUpperCase();
    const effectiveTtl = ttlMs !== undefined ? ttlMs : this.defaultTtlMs;
    const now = Date.now();
    const expiresAt = effectiveTtl > 0 ? now + effectiveTtl : null;

    const store = { ...this.loadStore() };
    const existing = store[normKey];

    store[normKey] = {
      value,
      expiresAt,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    // 期限切れエントリの事前クリーンアップ
    for (const k of Object.keys(store)) {
      const entry = store[k];
      if (entry && entry.expiresAt !== null && now > entry.expiresAt) {
        delete store[k];
      }
    }

    // 最大件数 (maxEntries) 超過時の LRU 削除
    const keys = Object.keys(store);
    if (keys.length > this.maxEntries) {
      // updatedAt の昇順 (古い順) にソート
      const sortedKeys = keys.sort((a, b) => {
        const itemA = store[a];
        const itemB = store[b];
        const timeA = itemA?.updatedAt ?? 0;
        const timeB = itemB?.updatedAt ?? 0;
        return timeA - timeB;
      });

      const removeCount = keys.length - this.maxEntries;
      for (let i = 0; i < removeCount; i++) {
        const keyToRemove = sortedKeys[i];
        if (keyToRemove) {
          delete store[keyToRemove];
          if (this.logger) {
            this.logger.info(`[LiteDbCache] Evicted LRU key: ${keyToRemove}`);
          }
        }
      }
    }

    this.saveStore(store);

    if (this.logger) {
      this.logger.info(`[LiteDbCache] Set key: ${normKey} (TTL: ${effectiveTtl}ms)`);
    }
  }

  public async invalidate(key: string): Promise<void> {
    const normKey = (key || '').trim().toUpperCase();
    const store = { ...this.loadStore() };
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

  public async getStats(): Promise<ICacheStats> {
    const store = this.loadStore();
    const now = Date.now();
    let validCount = 0;
    for (const key of Object.keys(store)) {
      const item = store[key];
      if (item && (item.expiresAt === null || now <= item.expiresAt)) {
        validCount++;
      }
    }

    let sizeBytes = 0;
    try {
      if (fs.existsSync(this.filePath)) {
        const stat = fs.statSync(this.filePath);
        sizeBytes = stat.size;
      }
    } catch {
      sizeBytes = 0;
    }

    return {
      count: validCount,
      maxEntries: this.maxEntries,
      defaultTtlMs: this.defaultTtlMs,
      sizeBytes,
    };
  }
}

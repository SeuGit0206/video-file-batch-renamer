/**
 * キャッシュアダプター インターフェース
 */
export interface ICacheAdapter<T = unknown> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttlMs?: number): Promise<void>;
  invalidate(key: string): Promise<void>;
  clear(): Promise<void>;
}

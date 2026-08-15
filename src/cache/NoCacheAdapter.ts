import type { ICacheAdapter } from './ICacheAdapter';

export class NoCacheAdapter<T = unknown> implements ICacheAdapter<T> {
  public async get(_key: string): Promise<T | null> {
    return null;
  }

  public async set(_key: string, _value: T, _ttlMs?: number): Promise<void> {
    // No-op
  }

  public async invalidate(_key: string): Promise<void> {
    // No-op
  }

  public async clear(): Promise<void> {
    // No-op
  }
}

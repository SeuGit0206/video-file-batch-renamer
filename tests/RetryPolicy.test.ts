import { describe, it, expect } from 'vitest';
import { RetryPolicy } from '../src/policies/RetryPolicy';

describe('RetryPolicy', () => {
  it('デフォルト設定値が正しく初期化される', () => {
    const policy = new RetryPolicy();

    expect(policy.getMaxRetries()).toBe(1);
    expect(policy.getCloudflareTimeout()).toBe(15000);
    expect(policy.getCloudflarePollInterval()).toBe(2000);
    expect(policy.getCloudflareMinWaitTime()).toBe(5000);
  });

  it('カスタムオプションで正しく初期化される', () => {
    const policy = new RetryPolicy({
      maxRetries: 3,
      initialDelayMs: 1000,
      backoffFactor: 2,
      cloudflareTimeoutMs: 30000,
      cloudflarePollIntervalMs: 1000,
      cloudflareMinWaitMs: 3000,
    });

    expect(policy.getMaxRetries()).toBe(3);
    expect(policy.getCloudflareTimeout()).toBe(30000);
    expect(policy.getCloudflarePollInterval()).toBe(1000);
    expect(policy.getCloudflareMinWaitTime()).toBe(3000);
  });

  it('shouldRetry が試行回数に応じて正しく判定を返す', () => {
    const policy = new RetryPolicy({ maxRetries: 2 });

    expect(policy.shouldRetry(1)).toBe(true);
    expect(policy.shouldRetry(2)).toBe(true);
    expect(policy.shouldRetry(3)).toBe(false);
  });

  it('getWaitTime が Exponential Backoff を含む待機時間を正しく計算する', () => {
    const policy = new RetryPolicy({
      initialDelayMs: 1000,
      backoffFactor: 2,
    });

    expect(policy.getWaitTime(1)).toBe(1000);
    expect(policy.getWaitTime(2)).toBe(2000);
    expect(policy.getWaitTime(3)).toBe(4000);
  });

  it('isCloudflareTimeout が経過時間に応じてタイムアウトを正しく判定する', () => {
    const policy = new RetryPolicy({ cloudflareTimeoutMs: 15000 });

    expect(policy.isCloudflareTimeout(10000)).toBe(false);
    expect(policy.isCloudflareTimeout(14999)).toBe(false);
    expect(policy.isCloudflareTimeout(15000)).toBe(true);
    expect(policy.isCloudflareTimeout(20000)).toBe(true);
  });
});

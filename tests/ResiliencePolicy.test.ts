import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TimeoutPolicy,
  TimeoutError,
  CircuitBreakerPolicy,
  CircuitBreakerOpenError,
  RateLimiterPolicy,
  RateLimitExceededError,
  BulkheadPolicy,
  BulkheadRejectedError,
  ResiliencePolicy,
} from '../src/policies';

describe('Resilience Policies Test Suite', () => {
  afterEach(() => {
    vi.useRealTimers();
  });
  describe('TimeoutPolicy', () => {
    it('タイムアウト指定時間内に完了した場合は結果を返却すること', async () => {
      const policy = new TimeoutPolicy({ timeoutMs: 500 });
      const result = await policy.execute(async () => {
        return 'success';
      });
      expect(result).toBe('success');
    });

    it('タイムアウト時間を超過した場合に TimeoutError をスローすること', async () => {
      const policy = new TimeoutPolicy({ timeoutMs: 50 });
      const slowTask = policy.execute(
        () => new Promise((resolve) => setTimeout(() => resolve('done'), 200))
      );

      await expect(slowTask).rejects.toThrow(TimeoutError);
    });
  });

  describe('CircuitBreakerPolicy', () => {
    beforeEach(() => {
      vi.useRealTimers();
    });

    it('初期状態は CLOSED であること', () => {
      const breaker = new CircuitBreakerPolicy();
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('連続失敗数が閾値(failureThreshold)に達すると OPEN に遷移し、後続リクエストを拒否すること', async () => {
      const breaker = new CircuitBreakerPolicy({ failureThreshold: 2, resetTimeoutMs: 1000 });

      const failingTask = () => Promise.reject(new Error('Internal Failure'));

      // 1回目の失敗
      await expect(breaker.execute(failingTask)).rejects.toThrow('Internal Failure');
      expect(breaker.getState()).toBe('CLOSED');

      // 2回目の失敗 (閾値到達 -> OPEN)
      await expect(breaker.execute(failingTask)).rejects.toThrow('Internal Failure');
      expect(breaker.getState()).toBe('OPEN');

      // OPEN状態での呼び出しは CircuitBreakerOpenError が高速失敗
      await expect(breaker.execute(() => Promise.resolve('ok'))).rejects.toThrow(CircuitBreakerOpenError);
    });

    it('OPEN状態で resetTimeoutMs 経過後に HALF_OPEN へ遷移し、成功回数条件を満たすと CLOSED に復帰すること', async () => {
      vi.useFakeTimers();
      const breaker = new CircuitBreakerPolicy({ failureThreshold: 1, resetTimeoutMs: 500, successThreshold: 1 });

      await expect(breaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
      expect(breaker.getState()).toBe('OPEN');

      // 500ms 経過を進める
      vi.advanceTimersByTime(501);

      // HALF_OPEN に自動遷移
      expect(breaker.getState()).toBe('HALF_OPEN');

      // HALF_OPEN 時の成功実行
      const result = await breaker.execute(() => Promise.resolve('recovered'));
      expect(result).toBe('recovered');

      // CLOSED に復帰
      expect(breaker.getState()).toBe('CLOSED');
      vi.useRealTimers();
    });
  });

  describe('RateLimiterPolicy', () => {
    it('許可回数内のリクエストを成功させること', async () => {
      const limiter = new RateLimiterPolicy({ maxRequests: 2, windowMs: 1000 });

      const res1 = await limiter.execute(async () => 'req1');
      const res2 = await limiter.execute(async () => 'req2');

      expect(res1).toBe('req1');
      expect(res2).toBe('req2');
      expect(limiter.getRemainingTokens()).toBe(0);
    });

    it('制限回数を超える呼び出しに対し RateLimitExceededError をスローすること', async () => {
      const limiter = new RateLimiterPolicy({ maxRequests: 1, windowMs: 1000 });

      await limiter.execute(async () => 'ok');

      await expect(limiter.execute(async () => 'fail')).rejects.toThrow(RateLimitExceededError);
    });
  });

  describe('BulkheadPolicy', () => {
    it('同時実行数が上限(maxConcurrent)に達している場合、キューに入り順次処理されること', async () => {
      const bulkhead = new BulkheadPolicy({ maxConcurrent: 1, maxQueueing: 2 });

      let task1Finished = false;
      const task1 = bulkhead.execute(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              task1Finished = true;
              resolve('task1');
            }, 50);
          })
      );

      const task2 = bulkhead.execute(async () => 'task2');

      expect(bulkhead.getActiveCount()).toBe(1);
      expect(bulkhead.getQueueLength()).toBe(1);

      const [res1, res2] = await Promise.all([task1, task2]);

      expect(res1).toBe('task1');
      expect(res2).toBe('task2');
      expect(task1Finished).toBe(true);
    });

    it('キュー上限数(maxQueueing)を超えた場合に BulkheadRejectedError をスローすること', async () => {
      const bulkhead = new BulkheadPolicy({ maxConcurrent: 1, maxQueueing: 1 });

      // Active (1/1)
      const task1 = bulkhead.execute(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      // Queued (1/1)
      const task2 = bulkhead.execute(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      // Overflow
      await expect(bulkhead.execute(async () => 'overflow')).rejects.toThrow(BulkheadRejectedError);

      await Promise.all([task1, task2]);
    });
  });

  describe('ResiliencePolicy Composite', () => {
    it('すべてのポリシーを順番に適用し、正常にタスクを実行できること', async () => {
      const resilience = new ResiliencePolicy({
        timeout: new TimeoutPolicy({ timeoutMs: 1000 }),
        circuitBreaker: new CircuitBreakerPolicy({ failureThreshold: 3 }),
        rateLimiter: new RateLimiterPolicy({ maxRequests: 5, windowMs: 1000 }),
        bulkhead: new BulkheadPolicy({ maxConcurrent: 2, maxQueueing: 2 }),
      });

      const result = await resilience.execute(async () => 'all-passed');
      expect(result).toBe('all-passed');
    });
  });
});

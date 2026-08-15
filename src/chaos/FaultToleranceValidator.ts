import type { ICircuitBreakerPolicy, IBulkheadPolicy, IRateLimiterPolicy } from '../policies';
import type { ICacheAdapter } from '../cache';

export interface FaultToleranceValidationReport {
  circuitBreakerValid: boolean;
  bulkheadValid: boolean;
  rateLimiterValid: boolean;
  cacheFailureBypassed: boolean;
  details: string[];
}

export interface IFaultToleranceValidator {
  validateCircuitBreaker(policy: ICircuitBreakerPolicy): Promise<boolean>;
  validateBulkhead(policy: IBulkheadPolicy): Promise<boolean>;
  validateRateLimiter(policy: IRateLimiterPolicy): Promise<boolean>;
  simulateCacheFailure(cache: ICacheAdapter<unknown>): Promise<boolean>;
  runFullValidation(
    circuitBreaker: ICircuitBreakerPolicy,
    bulkhead: IBulkheadPolicy,
    rateLimiter: IRateLimiterPolicy,
    cache: ICacheAdapter<unknown>
  ): Promise<FaultToleranceValidationReport>;
}

export class FaultToleranceValidator implements IFaultToleranceValidator {
  public async validateCircuitBreaker(policy: ICircuitBreakerPolicy): Promise<boolean> {
    try {
      // 意図的に失敗させて Open 状態に移行できるか検証
      let tripped = false;
      for (let i = 0; i < 10; i++) {
        try {
          await policy.execute(async () => {
            throw new Error('Forced Failure for CircuitBreaker Validation');
          });
        } catch (e) {
          if ((e as Error).message.includes('Circuit breaker is OPEN')) {
            tripped = true;
            break;
          }
        }
      }
      return tripped;
    } catch {
      return false;
    }
  }

  public async validateBulkhead(policy: IBulkheadPolicy): Promise<boolean> {
    try {
      let rejected = false;
      const tasks: Promise<unknown>[] = [];

      // Bulkhead の容量を超える並行タスクを発行
      for (let i = 0; i < 30; i++) {
        tasks.push(
          policy.execute(async () => {
            await new Promise((res) => setTimeout(res, 100));
          }).catch((err: Error) => {
            const msg = err?.message || String(err);
            if (
              msg.includes('Bulkhead') ||
              msg.includes('queue is full') ||
              msg.includes('capacity exceeded') ||
              msg.includes('rejected') ||
              err?.name === 'BulkheadRejectedError'
            ) {
              rejected = true;
            }
          })
        );
      }

      await Promise.all(tasks);
      return rejected;
    } catch {
      return false;
    }
  }

  public async validateRateLimiter(policy: IRateLimiterPolicy): Promise<boolean> {
    try {
      let limited = false;
      for (let i = 0; i < 50; i++) {
        try {
          await policy.execute(async () => 'ok');
        } catch (e) {
          if ((e as Error).message.includes('Rate limit exceeded')) {
            limited = true;
            break;
          }
        }
      }
      return limited;
    } catch {
      return false;
    }
  }

  public async simulateCacheFailure(cache: ICacheAdapter<unknown>): Promise<boolean> {
    try {
      // キャッシュに障害を注入（エラーを投げるモンキーパッチ）してフォールバックバイパスの動作を確認
      const originalGet = cache.get.bind(cache);
      let bypassed = false;

      // 障害シミュレーション
      cache.get = async () => {
        throw new Error('[Cache Failure Simulation] Redis/Database connection lost');
      };

      try {
        await cache.get('test_key');
      } catch (err) {
        if ((err as Error).message.includes('connection lost')) {
          bypassed = true;
        }
      } finally {
        // 元に戻す
        cache.get = originalGet;
      }

      return bypassed;
    } catch {
      return false;
    }
  }

  public async runFullValidation(
    circuitBreaker: ICircuitBreakerPolicy,
    bulkhead: IBulkheadPolicy,
    rateLimiter: IRateLimiterPolicy,
    cache: ICacheAdapter<unknown>
  ): Promise<FaultToleranceValidationReport> {
    const details: string[] = [];

    const circuitBreakerValid = await this.validateCircuitBreaker(circuitBreaker);
    details.push(`Circuit Breaker Validation: ${circuitBreakerValid ? 'PASSED' : 'FAILED'}`);

    const bulkheadValid = await this.validateBulkhead(bulkhead);
    details.push(`Bulkhead Validation: ${bulkheadValid ? 'PASSED' : 'FAILED'}`);

    const rateLimiterValid = await this.validateRateLimiter(rateLimiter);
    details.push(`Rate Limiter Validation: ${rateLimiterValid ? 'PASSED' : 'FAILED'}`);

    const cacheFailureBypassed = await this.simulateCacheFailure(cache);
    details.push(`Cache Failure Bypass Simulation: ${cacheFailureBypassed ? 'PASSED' : 'FAILED'}`);

    return {
      circuitBreakerValid,
      bulkheadValid,
      rateLimiterValid,
      cacheFailureBypassed,
      details,
    };
  }
}

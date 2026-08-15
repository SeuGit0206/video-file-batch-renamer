import type { ICircuitBreakerPolicy } from './CircuitBreakerPolicy';
import type { IRateLimiterPolicy } from './RateLimiterPolicy';
import type { IBulkheadPolicy } from './BulkheadPolicy';
import type { ITimeoutPolicy } from './TimeoutPolicy';

export interface ResiliencePolicyDependencies {
  circuitBreaker?: ICircuitBreakerPolicy;
  rateLimiter?: IRateLimiterPolicy;
  bulkhead?: IBulkheadPolicy;
  timeout?: ITimeoutPolicy;
}

export interface IResiliencePolicy {
  execute<T>(fn: () => Promise<T>): Promise<T>;
  getCircuitBreaker(): ICircuitBreakerPolicy | undefined;
  getRateLimiter(): IRateLimiterPolicy | undefined;
  getBulkhead(): IBulkheadPolicy | undefined;
  getTimeout(): ITimeoutPolicy | undefined;
}

/**
 * 複数の Resilience Policy (RateLimiter -> Bulkhead -> CircuitBreaker -> Timeout) を順番に適用するパイプラインクラス
 */
export class ResiliencePolicy implements IResiliencePolicy {
  private circuitBreaker?: ICircuitBreakerPolicy;
  private rateLimiter?: IRateLimiterPolicy;
  private bulkhead?: IBulkheadPolicy;
  private timeout?: ITimeoutPolicy;

  constructor(deps: ResiliencePolicyDependencies = {}) {
    this.circuitBreaker = deps.circuitBreaker;
    this.rateLimiter = deps.rateLimiter;
    this.bulkhead = deps.bulkhead;
    this.timeout = deps.timeout;
  }

  public getCircuitBreaker(): ICircuitBreakerPolicy | undefined {
    return this.circuitBreaker;
  }

  public getRateLimiter(): IRateLimiterPolicy | undefined {
    return this.rateLimiter;
  }

  public getBulkhead(): IBulkheadPolicy | undefined {
    return this.bulkhead;
  }

  public getTimeout(): ITimeoutPolicy | undefined {
    return this.timeout;
  }

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    // 実行順序: RateLimiter -> Bulkhead -> CircuitBreaker -> Timeout -> fn()
    let action = fn;

    if (this.timeout) {
      const timeoutPolicy = this.timeout;
      const innerAction = action;
      action = () => timeoutPolicy.execute(innerAction);
    }

    if (this.circuitBreaker) {
      const cbPolicy = this.circuitBreaker;
      const innerAction = action;
      action = () => cbPolicy.execute(innerAction);
    }

    if (this.bulkhead) {
      const bulkheadPolicy = this.bulkhead;
      const innerAction = action;
      action = () => bulkheadPolicy.execute(innerAction);
    }

    if (this.rateLimiter) {
      const rateLimiterPolicy = this.rateLimiter;
      const innerAction = action;
      action = () => rateLimiterPolicy.execute(innerAction);
    }

    return action();
  }
}

import { BaseAppError } from '../errors';
import type { ILogger } from '../services';

export class CircuitBreakerOpenError extends BaseAppError {
  constructor(message: string = 'Circuit breaker is open') {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  successThreshold?: number;
  logger?: ILogger;
}

export interface ICircuitBreakerPolicy {
  execute<T>(fn: () => Promise<T>): Promise<T>;
  getState(): CircuitState;
  reset(): void;
}

export class CircuitBreakerPolicy implements ICircuitBreakerPolicy {
  private failureThreshold: number;
  private resetTimeoutMs: number;
  private successThreshold: number;
  private logger?: ILogger;

  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private halfOpenSuccessCount = 0;
  private nextAttemptTime = 0;

  constructor(options?: CircuitBreakerOptions) {
    this.failureThreshold = options?.failureThreshold ?? 5;
    this.resetTimeoutMs = options?.resetTimeoutMs ?? 30000;
    this.successThreshold = options?.successThreshold ?? 2;
    this.logger = options?.logger;
  }

  public getState(): CircuitState {
    this.updateState();
    return this.state;
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.halfOpenSuccessCount = 0;
    this.nextAttemptTime = 0;
    if (this.logger) {
      this.logger.info('[CircuitBreaker] Circuit breaker reset to CLOSED state');
    }
  }

  private updateState(): void {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttemptTime) {
      this.state = 'HALF_OPEN';
      this.halfOpenSuccessCount = 0;
      if (this.logger) {
        this.logger.info('[CircuitBreaker] Transitioned from OPEN to HALF_OPEN state');
      }
    }
  }

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.updateState();

    if (this.state === 'OPEN') {
      if (this.logger) {
        this.logger.warn('[CircuitBreaker] Request rejected: Circuit is OPEN');
      }
      throw new CircuitBreakerOpenError(`Circuit breaker is OPEN. Fast failing requests until ${new Date(this.nextAttemptTime).toISOString()}`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccessCount++;
      if (this.halfOpenSuccessCount >= this.successThreshold) {
        this.reset();
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  private onFailure(err: unknown): void {
    if (this.state === 'HALF_OPEN') {
      this.tripOpen();
    } else if (this.state === 'CLOSED') {
      this.failureCount++;
      if (this.failureCount >= this.failureThreshold) {
        this.tripOpen();
      }
    }
    if (this.logger) {
      this.logger.error(`[CircuitBreaker] Failure recorded. Count: ${this.failureCount}/${this.failureThreshold}. Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private tripOpen(): void {
    this.state = 'OPEN';
    this.nextAttemptTime = Date.now() + this.resetTimeoutMs;
    if (this.logger) {
      this.logger.warn(`[CircuitBreaker] Circuit TRIPPED OPEN. Will retry after ${this.resetTimeoutMs}ms`);
    }
  }
}

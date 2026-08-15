import { BaseAppError } from '../errors';
import type { ILogger } from '../services';

export class RateLimitExceededError extends BaseAppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

export interface RateLimiterOptions {
  maxRequests?: number;
  windowMs?: number;
  logger?: ILogger;
}

export interface IRateLimiterPolicy {
  execute<T>(fn: () => Promise<T>): Promise<T>;
  tryAcquire(): boolean;
  getRemainingTokens(): number;
  reset(): void;
}

export class RateLimiterPolicy implements IRateLimiterPolicy {
  private maxRequests: number;
  private windowMs: number;
  private logger?: ILogger;
  private timestamps: number[] = [];

  constructor(options?: RateLimiterOptions) {
    this.maxRequests = options?.maxRequests ?? 100;
    this.windowMs = options?.windowMs ?? 60000;
    this.logger = options?.logger;
  }

  private cleanupOldTimestamps(now: number): void {
    const cutoff = now - this.windowMs;
    this.timestamps = this.timestamps.filter((ts) => ts > cutoff);
  }

  public tryAcquire(): boolean {
    const now = Date.now();
    this.cleanupOldTimestamps(now);

    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(now);
      return true;
    }
    return false;
  }

  public getRemainingTokens(): number {
    const now = Date.now();
    this.cleanupOldTimestamps(now);
    return Math.max(0, this.maxRequests - this.timestamps.length);
  }

  public reset(): void {
    this.timestamps = [];
  }

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.tryAcquire()) {
      if (this.logger) {
        this.logger.warn(`[RateLimiter] Limit of ${this.maxRequests} requests per ${this.windowMs}ms reached.`);
      }
      throw new RateLimitExceededError(`Rate limit exceeded: Max ${this.maxRequests} requests per ${this.windowMs}ms.`);
    }

    return fn();
  }
}

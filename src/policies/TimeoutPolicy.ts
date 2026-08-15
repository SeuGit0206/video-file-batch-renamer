import { BaseAppError } from '../errors';

export class TimeoutError extends BaseAppError {
  constructor(message: string = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export interface TimeoutPolicyOptions {
  timeoutMs?: number;
}

export interface ITimeoutPolicy {
  execute<T>(fn: () => Promise<T>, timeoutMs?: number): Promise<T>;
  getTimeoutMs(): number;
}

export class TimeoutPolicy implements ITimeoutPolicy {
  private defaultTimeoutMs: number;

  constructor(options?: TimeoutPolicyOptions) {
    this.defaultTimeoutMs = options?.timeoutMs ?? 30000;
  }

  public getTimeoutMs(): number {
    return this.defaultTimeoutMs;
  }

  public async execute<T>(fn: () => Promise<T>, timeoutMs?: number): Promise<T> {
    const effectiveTimeout = timeoutMs !== undefined ? timeoutMs : this.defaultTimeoutMs;
    if (effectiveTimeout <= 0) {
      return fn();
    }

    let timer: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new TimeoutError(`Operation exceeded time limit of ${effectiveTimeout}ms`));
      }, effectiveTimeout);
    });

    try {
      const result = await Promise.race([fn(), timeoutPromise]);
      return result;
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}

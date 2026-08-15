import { BaseAppError } from '../errors';
import type { ILogger } from '../services';

export class BulkheadRejectedError extends BaseAppError {
  constructor(message: string = 'Bulkhead capacity exceeded') {
    super(message);
    this.name = 'BulkheadRejectedError';
  }
}

export interface BulkheadOptions {
  maxConcurrent?: number;
  maxQueueing?: number;
  logger?: ILogger;
}

export interface IBulkheadPolicy {
  execute<T>(fn: () => Promise<T>): Promise<T>;
  getActiveCount(): number;
  getQueueLength(): number;
}

interface QueuedTask<T> {
  fn: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

export class BulkheadPolicy implements IBulkheadPolicy {
  private maxConcurrent: number;
  private maxQueueing: number;
  private logger?: ILogger;

  private activeCount = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queue: QueuedTask<any>[] = [];

  constructor(options?: BulkheadOptions) {
    this.maxConcurrent = options?.maxConcurrent ?? 10;
    this.maxQueueing = options?.maxQueueing ?? 10;
    this.logger = options?.logger;
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount < this.maxConcurrent) {
      return this.runTask(fn);
    }

    if (this.queue.length >= this.maxQueueing) {
      if (this.logger) {
        this.logger.warn(`[Bulkhead] Task rejected: Active ${this.activeCount}/${this.maxConcurrent}, Queue ${this.queue.length}/${this.maxQueueing}`);
      }
      throw new BulkheadRejectedError(`Bulkhead execution queue is full (max concurrent: ${this.maxConcurrent}, max queue: ${this.maxQueueing}).`);
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
    });
  }

  private async runTask<T>(fn: () => Promise<T>): Promise<T> {
    this.activeCount++;
    try {
      const result = await fn();
      return result;
    } finally {
      this.activeCount--;
      this.dequeueNext();
    }
  }

  private dequeueNext(): void {
    if (this.activeCount < this.maxConcurrent && this.queue.length > 0) {
      const nextTask = this.queue.shift();
      if (nextTask) {
        this.runTask(nextTask.fn)
          .then(nextTask.resolve)
          .catch(nextTask.reject);
      }
    }
  }
}

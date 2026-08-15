export interface MemoryUsageStats {
  rssMB: number;
  heapTotalMB: number;
  heapUsedMB: number;
  externalMB: number;
  heapUsageRatio: number;
}

export class BufferPool {
  private pool: Buffer[] = [];
  private bufferSize: number;
  private poolCapacity: number;

  constructor(bufferSize: number, poolCapacity: number = 10) {
    this.bufferSize = bufferSize;
    this.poolCapacity = poolCapacity;
  }

  public acquire(): Buffer {
    const buf = this.pool.pop();
    if (buf) {
      buf.fill(0);
      return buf;
    }
    return Buffer.allocUnsafe(this.bufferSize);
  }

  public release(buf: Buffer): void {
    if (buf.length === this.bufferSize && this.pool.length < this.poolCapacity) {
      this.pool.push(buf);
    }
  }

  public size(): number {
    return this.pool.length;
  }

  public clear(): void {
    this.pool = [];
  }
}

export interface IMemoryOptimizer {
  getMemoryStats(): MemoryUsageStats;
  checkAndCleanMemory(cleanupCallbacks: Array<() => void>, maxHeapUsedMB?: number): boolean;
  createBufferPool(bufferSize: number, poolCapacity?: number): BufferPool;
}

export class MemoryOptimizer implements IMemoryOptimizer {
  public getMemoryStats(): MemoryUsageStats {
    const usage = process.memoryUsage();
    const toMB = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

    return {
      rssMB: toMB(usage.rss),
      heapTotalMB: toMB(usage.heapTotal),
      heapUsedMB: toMB(usage.heapUsed),
      externalMB: toMB(usage.external),
      heapUsageRatio: Math.round((usage.heapUsed / usage.heapTotal) * 100) / 100,
    };
  }

  public checkAndCleanMemory(cleanupCallbacks: Array<() => void>, maxHeapUsedMB: number = 512): boolean {
    const stats = this.getMemoryStats();
    if (stats.heapUsedMB > maxHeapUsedMB) {
      for (const cb of cleanupCallbacks) {
        try {
          cb();
        } catch {
          // ignore cleanup errors
        }
      }
      return true;
    }
    return false;
  }

  public createBufferPool(bufferSize: number, poolCapacity: number = 10): BufferPool {
    return new BufferPool(bufferSize, poolCapacity);
  }
}

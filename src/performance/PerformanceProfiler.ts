export interface ProfileMetric {
  name: string;
  durationMs: number;
  timestamp: number;
}

export interface MetricSummary {
  count: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
}

export interface PerformanceStats {
  totalMeasurements: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  p95DurationMs: number;
  byName: Record<string, MetricSummary>;
  bottlenecks: Array<{ name: string; avgMs: number }>;
}

export interface IPerformanceProfiler {
  startTimer(name: string): () => number;
  measure<T>(name: string, fn: () => Promise<T>): Promise<T>;
  record(name: string, durationMs: number): void;
  getStats(): PerformanceStats;
  clear(): void;
}

export class PerformanceProfiler implements IPerformanceProfiler {
  private metrics: ProfileMetric[] = [];
  private maxStoredMetrics: number;

  constructor(maxStoredMetrics: number = 1000) {
    this.maxStoredMetrics = maxStoredMetrics;
  }

  public startTimer(name: string): () => number {
    const start = performance.now();
    return () => {
      const durationMs = performance.now() - start;
      this.record(name, durationMs);
      return durationMs;
    };
  }

  public async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const stop = this.startTimer(name);
    try {
      return await fn();
    } finally {
      stop();
    }
  }

  public record(name: string, durationMs: number): void {
    if (this.metrics.length >= this.maxStoredMetrics) {
      // 古いメトリクスを廃棄してメモリ管理
      this.metrics.shift();
    }
    this.metrics.push({
      name,
      durationMs,
      timestamp: Date.now(),
    });
  }

  public getStats(): PerformanceStats {
    if (this.metrics.length === 0) {
      return {
        totalMeasurements: 0,
        avgDurationMs: 0,
        minDurationMs: 0,
        maxDurationMs: 0,
        p95DurationMs: 0,
        byName: {},
        bottlenecks: [],
      };
    }

    const durations = this.metrics.map((m) => m.durationMs).sort((a, b) => a - b);
    const sum = durations.reduce((acc, d) => acc + d, 0);
    const min = durations[0];
    const max = durations[durations.length - 1];
    const p95Index = Math.min(Math.floor(durations.length * 0.95), durations.length - 1);
    const p95 = durations[p95Index];

    const byName: Record<string, MetricSummary> = {};
    const grouped: Record<string, number[]> = {};

    for (const m of this.metrics) {
      if (!grouped[m.name]) {
        grouped[m.name] = [];
      }
      grouped[m.name].push(m.durationMs);
    }

    for (const [name, list] of Object.entries(grouped)) {
      const nameSum = list.reduce((a, b) => a + b, 0);
      const sorted = [...list].sort((a, b) => a - b);
      byName[name] = {
        count: list.length,
        avgMs: nameSum / list.length,
        minMs: sorted[0],
        maxMs: sorted[sorted.length - 1],
      };
    }

    // 平均処理時間が上位（ボトルネック）のプロセスのリスト
    const bottlenecks = Object.entries(byName)
      .map(([name, summary]) => ({ name, avgMs: summary.avgMs }))
      .sort((a, b) => b.avgMs - a.avgMs)
      .slice(0, 5);

    return {
      totalMeasurements: this.metrics.length,
      avgDurationMs: sum / this.metrics.length,
      minDurationMs: min,
      maxDurationMs: max,
      p95DurationMs: p95,
      byName,
      bottlenecks,
    };
  }

  public clear(): void {
    this.metrics = [];
  }
}

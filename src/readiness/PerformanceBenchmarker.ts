export interface PerformanceMetric {
  taskName: string;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  avgMs: number;
  operationsPerSec: number;
}

export interface PerformanceBenchmarkReport {
  benchmarks: PerformanceMetric[];
  overallPerformanceGrade: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION';
  timestamp: string;
}

export interface IPerformanceBenchmarker {
  runBenchmarkSuite(): Promise<PerformanceBenchmarkReport>;
}

export class PerformanceBenchmarker implements IPerformanceBenchmarker {
  public async runBenchmarkSuite(): Promise<PerformanceBenchmarkReport> {
    const benchmarks: PerformanceMetric[] = [];

    // Benchmark 1: JSON Serialization & Parsing (10,000 ops)
    benchmarks.push(await this.benchmarkTask('JSON Serialization', () => {
      const obj = { id: 'TEST-123', title: 'Performance Test', tags: ['a', 'b', 'c'] };
      const str = JSON.stringify(obj);
      JSON.parse(str);
    }, 1000));

    // Benchmark 2: CPU Math Calculation (10,000 ops)
    benchmarks.push(await this.benchmarkTask('CPU Math Operations', () => {
      let x = 0;
      for (let i = 0; i < 50; i++) {
        x += Math.sqrt(i) * Math.sin(i);
      }
      return x;
    }, 1000));

    // Benchmark 3: Async Event Loop Resolution
    benchmarks.push(await this.benchmarkTaskAsync('Async Microtask Throughput', async () => {
      await Promise.resolve(42);
    }, 500));

    const avgP95 = benchmarks.reduce((acc, b) => acc + b.p95Ms, 0) / benchmarks.length;
    let grade: PerformanceBenchmarkReport['overallPerformanceGrade'] = 'EXCELLENT';
    if (avgP95 > 50) {
      grade = 'NEEDS_ATTENTION';
    } else if (avgP95 > 10) {
      grade = 'GOOD';
    }

    return {
      benchmarks,
      overallPerformanceGrade: grade,
      timestamp: new Date().toISOString(),
    };
  }

  private async benchmarkTask(name: string, task: () => void, iterations: number): Promise<PerformanceMetric> {
    const durations: number[] = [];
    const totalStart = Date.now();

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      task();
      const end = performance.now();
      durations.push(end - start);
    }

    const totalDurationMs = Math.max(1, Date.now() - totalStart);
    durations.sort((a, b) => a - b);

    const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
    const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
    const p99 = durations[Math.floor(durations.length * 0.99)] || 0;
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const ops = Math.round((iterations / totalDurationMs) * 1000);

    return {
      taskName: name,
      p50Ms: Math.round(p50 * 1000) / 1000,
      p95Ms: Math.round(p95 * 1000) / 1000,
      p99Ms: Math.round(p99 * 1000) / 1000,
      avgMs: Math.round(avg * 1000) / 1000,
      operationsPerSec: ops,
    };
  }

  private async benchmarkTaskAsync(name: string, task: () => Promise<void>, iterations: number): Promise<PerformanceMetric> {
    const durations: number[] = [];
    const totalStart = Date.now();

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await task();
      const end = performance.now();
      durations.push(end - start);
    }

    const totalDurationMs = Math.max(1, Date.now() - totalStart);
    durations.sort((a, b) => a - b);

    const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
    const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
    const p99 = durations[Math.floor(durations.length * 0.99)] || 0;
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const ops = Math.round((iterations / totalDurationMs) * 1000);

    return {
      taskName: name,
      p50Ms: Math.round(p50 * 1000) / 1000,
      p95Ms: Math.round(p95 * 1000) / 1000,
      p99Ms: Math.round(p99 * 1000) / 1000,
      avgMs: Math.round(avg * 1000) / 1000,
      operationsPerSec: ops,
    };
  }
}

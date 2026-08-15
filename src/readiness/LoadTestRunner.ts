export interface LoadTestConfig {
  virtualUsers: number;
  durationMs: number;
  targetEndpoint: string;
}

export interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  requestsPerSecond: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRatePercentage: number;
  timestamp: string;
}

export interface ILoadTestRunner {
  runLoadTest(config?: Partial<LoadTestConfig>, requestHandler?: () => Promise<boolean>): Promise<LoadTestResult>;
}

export class LoadTestRunner implements ILoadTestRunner {
  public async runLoadTest(
    config?: Partial<LoadTestConfig>,
    requestHandler?: () => Promise<boolean>
  ): Promise<LoadTestResult> {
    const virtualUsers = config?.virtualUsers || 10;
    const durationMs = config?.durationMs || 500;
    const defaultHandler = requestHandler || (async () => true);

    const latencies: number[] = [];
    let successCount = 0;
    let failCount = 0;

    const startTime = Date.now();
    const endTime = startTime + durationMs;

    const userWorker = async () => {
      while (Date.now() < endTime) {
        const reqStart = performance.now();
        try {
          const pass = await defaultHandler();
          const reqEnd = performance.now();
          latencies.push(reqEnd - reqStart);
          if (pass) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          const reqEnd = performance.now();
          latencies.push(reqEnd - reqStart);
          failCount++;
        }
      }
    };

    const workers: Promise<void>[] = [];
    for (let i = 0; i < virtualUsers; i++) {
      workers.push(userWorker());
    }

    await Promise.all(workers);

    const actualDurationMs = Math.max(1, Date.now() - startTime);
    const totalRequests = successCount + failCount;
    const rps = Math.round((totalRequests / actualDurationMs) * 1000);

    latencies.sort((a, b) => a - b);
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    const p95Latency = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    const errorRate = totalRequests > 0 ? Math.round((failCount / totalRequests) * 10000) / 100 : 0;

    return {
      totalRequests,
      successfulRequests: successCount,
      failedRequests: failCount,
      requestsPerSecond: rps,
      avgLatencyMs: Math.round(avgLatency * 100) / 100,
      p95LatencyMs: Math.round(p95Latency * 100) / 100,
      errorRatePercentage: errorRate,
      timestamp: new Date().toISOString(),
    };
  }
}

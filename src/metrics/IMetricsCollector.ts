export interface MetricsSnapshot {
  requests: {
    total: number;
    success: number;
    error: number;
    avgDurationMs: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRatio: number;
  };
  scraping: {
    count: number;
    totalDurationMs: number;
    avgDurationMs: number;
    providerDurations: Record<string, number>;
  };
  pipeline: {
    steps: Record<string, {
      executions: number;
      successes: number;
      failures: number;
      totalDurationMs: number;
    }>;
  };
  retry: {
    retries: number;
    cloudflareEncounters: number;
    headfulSwitches: number;
  };
  gemini: {
    fallbacks: number;
    successes: number;
  };
  diagnostics: {
    htmlSaved: number;
    cdpLogsSaved: number;
  };
}

export interface IMetricsCollector {
  recordRequest(durationMs: number, success: boolean): void;
  recordCacheHit(): void;
  recordCacheMiss(): void;
  recordScraping(providerName: string, durationMs: number): void;
  recordStepExecution(stepName: string, durationMs: number, success: boolean): void;
  recordRetry(): void;
  recordCloudflareEncounter(): void;
  recordHeadfulSwitch(): void;
  recordGeminiFallback(success: boolean): void;
  recordHtmlSaved(): void;
  recordCdpLogSaved(): void;
  getSnapshot(): MetricsSnapshot;
  reset(): void;
}

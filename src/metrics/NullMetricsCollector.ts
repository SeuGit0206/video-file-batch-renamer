import type { IMetricsCollector, MetricsSnapshot } from './IMetricsCollector';

export class NullMetricsCollector implements IMetricsCollector {
  public recordRequest(_durationMs: number, _success: boolean): void {
    // No-op
  }

  public recordCacheHit(): void {
    // No-op
  }

  public recordCacheMiss(): void {
    // No-op
  }

  public recordScraping(_providerName: string, _durationMs: number): void {
    // No-op
  }

  public recordStepExecution(_stepName: string, _durationMs: number, _success: boolean): void {
    // No-op
  }

  public recordRetry(): void {
    // No-op
  }

  public recordCloudflareEncounter(): void {
    // No-op
  }

  public recordHeadfulSwitch(): void {
    // No-op
  }

  public recordGeminiFallback(_success: boolean): void {
    // No-op
  }

  public recordHtmlSaved(): void {
    // No-op
  }

  public recordCdpLogSaved(): void {
    // No-op
  }

  public getSnapshot(): MetricsSnapshot {
    return {
      requests: { total: 0, success: 0, error: 0, avgDurationMs: 0 },
      cache: { hits: 0, misses: 0, hitRatio: 0 },
      scraping: { count: 0, totalDurationMs: 0, avgDurationMs: 0, providerDurations: {} },
      pipeline: { steps: {} },
      retry: { retries: 0, cloudflareEncounters: 0, headfulSwitches: 0 },
      gemini: { fallbacks: 0, successes: 0 },
      diagnostics: { htmlSaved: 0, cdpLogsSaved: 0 }
    };
  }

  public reset(): void {
    // No-op
  }
}

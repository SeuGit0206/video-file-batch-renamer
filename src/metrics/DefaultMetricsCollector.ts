import type { IMetricsCollector, MetricsSnapshot } from './IMetricsCollector';

export class DefaultMetricsCollector implements IMetricsCollector {
  private requestTotal = 0;
  private requestSuccess = 0;
  private requestError = 0;
  private requestTotalDurationMs = 0;

  private cacheHits = 0;
  private cacheMisses = 0;

  private scrapingCount = 0;
  private scrapingTotalDurationMs = 0;
  private providerDurations: Record<string, number> = {};

  private stepStats: Record<string, { executions: number; successes: number; failures: number; totalDurationMs: number }> = {};

  private retries = 0;
  private cloudflareEncounters = 0;
  private headfulSwitches = 0;

  private geminiFallbacks = 0;
  private geminiSuccesses = 0;

  private htmlSaved = 0;
  private cdpLogsSaved = 0;

  public recordRequest(durationMs: number, success: boolean): void {
    this.requestTotal++;
    if (success) {
      this.requestSuccess++;
    } else {
      this.requestError++;
    }
    this.requestTotalDurationMs += Math.max(0, durationMs);
  }

  public recordCacheHit(): void {
    this.cacheHits++;
  }

  public recordCacheMiss(): void {
    this.cacheMisses++;
  }

  public recordScraping(providerName: string, durationMs: number): void {
    this.scrapingCount++;
    const dur = Math.max(0, durationMs);
    this.scrapingTotalDurationMs += dur;
    this.providerDurations[providerName] = (this.providerDurations[providerName] || 0) + dur;
  }

  public recordStepExecution(stepName: string, durationMs: number, success: boolean): void {
    const dur = Math.max(0, durationMs);
    if (!this.stepStats[stepName]) {
      this.stepStats[stepName] = { executions: 0, successes: 0, failures: 0, totalDurationMs: 0 };
    }
    const stat = this.stepStats[stepName];
    stat.executions++;
    if (success) {
      stat.successes++;
    } else {
      stat.failures++;
    }
    stat.totalDurationMs += dur;
  }

  public recordRetry(): void {
    this.retries++;
  }

  public recordCloudflareEncounter(): void {
    this.cloudflareEncounters++;
  }

  public recordHeadfulSwitch(): void {
    this.headfulSwitches++;
  }

  public recordGeminiFallback(success: boolean): void {
    this.geminiFallbacks++;
    if (success) {
      this.geminiSuccesses++;
    }
  }

  public recordHtmlSaved(): void {
    this.htmlSaved++;
  }

  public recordCdpLogSaved(): void {
    this.cdpLogsSaved++;
  }

  public getSnapshot(): MetricsSnapshot {
    const totalCache = this.cacheHits + this.cacheMisses;
    const hitRatio = totalCache > 0 ? this.cacheHits / totalCache : 0;
    const avgReqDur = this.requestTotal > 0 ? this.requestTotalDurationMs / this.requestTotal : 0;
    const avgScrapeDur = this.scrapingCount > 0 ? this.scrapingTotalDurationMs / this.scrapingCount : 0;

    return {
      requests: {
        total: this.requestTotal,
        success: this.requestSuccess,
        error: this.requestError,
        avgDurationMs: avgReqDur
      },
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRatio
      },
      scraping: {
        count: this.scrapingCount,
        totalDurationMs: this.scrapingTotalDurationMs,
        avgDurationMs: avgScrapeDur,
        providerDurations: { ...this.providerDurations }
      },
      pipeline: {
        steps: JSON.parse(JSON.stringify(this.stepStats))
      },
      retry: {
        retries: this.retries,
        cloudflareEncounters: this.cloudflareEncounters,
        headfulSwitches: this.headfulSwitches
      },
      gemini: {
        fallbacks: this.geminiFallbacks,
        successes: this.geminiSuccesses
      },
      diagnostics: {
        htmlSaved: this.htmlSaved,
        cdpLogsSaved: this.cdpLogsSaved
      }
    };
  }

  public reset(): void {
    this.requestTotal = 0;
    this.requestSuccess = 0;
    this.requestError = 0;
    this.requestTotalDurationMs = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.scrapingCount = 0;
    this.scrapingTotalDurationMs = 0;
    this.providerDurations = {};
    this.stepStats = {};
    this.retries = 0;
    this.cloudflareEncounters = 0;
    this.headfulSwitches = 0;
    this.geminiFallbacks = 0;
    this.geminiSuccesses = 0;
    this.htmlSaved = 0;
    this.cdpLogsSaved = 0;
  }
}

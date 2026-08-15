import { describe, it, expect } from 'vitest';
import { DefaultMetricsCollector, NullMetricsCollector } from '../src/metrics';

describe('MetricsCollector Test Suite', () => {
  describe('DefaultMetricsCollector', () => {
    it('リクエストメトリクス（成功・失敗・平均時間）が正しく記録されること', () => {
      const collector = new DefaultMetricsCollector();

      collector.recordRequest(100, true);
      collector.recordRequest(200, true);
      collector.recordRequest(300, false);

      const snapshot = collector.getSnapshot();
      expect(snapshot.requests.total).toBe(3);
      expect(snapshot.requests.success).toBe(2);
      expect(snapshot.requests.error).toBe(1);
      expect(snapshot.requests.avgDurationMs).toBe(200); // (100 + 200 + 300) / 3 = 200
    });

    it('キャッシュメトリクス（Hit, Miss, Hit率）が正しく計算されること', () => {
      const collector = new DefaultMetricsCollector();

      collector.recordCacheHit();
      collector.recordCacheHit();
      collector.recordCacheHit();
      collector.recordCacheMiss();

      const snapshot = collector.getSnapshot();
      expect(snapshot.cache.hits).toBe(3);
      expect(snapshot.cache.misses).toBe(1);
      expect(snapshot.cache.hitRatio).toBe(0.75); // 3 / 4
    });

    it('ScrapingおよびProvider実行時間が正しく集計されること', () => {
      const collector = new DefaultMetricsCollector();

      collector.recordScraping('MissAvProvider', 1500);
      collector.recordScraping('MissAvProvider', 2500);

      const snapshot = collector.getSnapshot();
      expect(snapshot.scraping.count).toBe(2);
      expect(snapshot.scraping.totalDurationMs).toBe(4000);
      expect(snapshot.scraping.avgDurationMs).toBe(2000);
      expect(snapshot.scraping.providerDurations['MissAvProvider']).toBe(4000);
    });

    it('Pipeline Stepごとの実行回数・成功数・失敗数が記録されること', () => {
      const collector = new DefaultMetricsCollector();

      collector.recordStepExecution('FetchHtmlStep', 500, true);
      collector.recordStepExecution('FetchHtmlStep', 300, false);

      const snapshot = collector.getSnapshot();
      const stepStat = snapshot.pipeline.steps['FetchHtmlStep'];
      expect(stepStat).toBeDefined();
      expect(stepStat.executions).toBe(2);
      expect(stepStat.successes).toBe(1);
      expect(stepStat.failures).toBe(1);
      expect(stepStat.totalDurationMs).toBe(800);
    });

    it('Retry, Gemini, Diagnostics メトリクスが記録されること', () => {
      const collector = new DefaultMetricsCollector();

      collector.recordRetry();
      collector.recordCloudflareEncounter();
      collector.recordHeadfulSwitch();
      collector.recordGeminiFallback(true);
      collector.recordHtmlSaved();
      collector.recordCdpLogSaved();

      const snapshot = collector.getSnapshot();
      expect(snapshot.retry.retries).toBe(1);
      expect(snapshot.retry.cloudflareEncounters).toBe(1);
      expect(snapshot.retry.headfulSwitches).toBe(1);
      expect(snapshot.gemini.fallbacks).toBe(1);
      expect(snapshot.gemini.successes).toBe(1);
      expect(snapshot.diagnostics.htmlSaved).toBe(1);
      expect(snapshot.diagnostics.cdpLogsSaved).toBe(1);
    });

    it('reset メソッドで全ての数値が初期化されること', () => {
      const collector = new DefaultMetricsCollector();

      collector.recordRequest(100, true);
      collector.recordCacheHit();
      collector.reset();

      const snapshot = collector.getSnapshot();
      expect(snapshot.requests.total).toBe(0);
      expect(snapshot.cache.hits).toBe(0);
      expect(snapshot.cache.hitRatio).toBe(0);
    });
  });

  describe('NullMetricsCollector', () => {
    it('どのような記録呼び出しでも副作用なくデフォルトの空スナップショットを返すこと', () => {
      const collector = new NullMetricsCollector();

      collector.recordRequest(500, true);
      collector.recordCacheHit();
      collector.recordRetry();
      collector.reset();

      const snapshot = collector.getSnapshot();
      expect(snapshot.requests.total).toBe(0);
      expect(snapshot.cache.hits).toBe(0);
      expect(snapshot.cache.hitRatio).toBe(0);
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import type { Response } from 'express';
import {
  StructuredLogger,
  DistributedTracer,
  PrometheusAndOtelExporter,
  AlertingMonitor,
  DiagnosticsTimeline,
  MonitoringMiddleware,
  type RequestWithTrace,
} from '../src/monitoring';

describe('Phase36 Production Monitoring & Distributed Tracing Suite', () => {
  describe('StructuredLogger', () => {
    it('構造化ログ (JSON) を正しくフォーマットして出力できること', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = new StructuredLogger('test-service');

      const traceCtx = StructuredLogger.createTraceContext('corr-123');
      logger.info('Test log message', traceCtx);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const rawLog = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(rawLog);

      expect(parsed.service).toBe('test-service');
      expect(parsed.level).toBe('INFO');
      expect(parsed.message).toBe('Test log message');
      expect(parsed.correlationId).toBe('corr-123');
      expect(parsed.traceId).toBeDefined();

      consoleSpy.mockRestore();
    });
  });

  describe('DistributedTracer', () => {
    it('Span の開始・終了、Duration、ステータスが正常に記録されること', () => {
      const tracer = new DistributedTracer();
      const span = tracer.startSpan('test_pipeline', 'PIPELINE');

      expect(span.kind).toBe('PIPELINE');
      expect(span.status).toBe('OK');
      expect(span.endTimeMs).toBeUndefined();

      tracer.finishSpan(span, 'OK');

      expect(span.endTimeMs).toBeGreaterThanOrEqual(span.startTimeMs);
      expect(span.durationMs).toBeGreaterThanOrEqual(0);

      const history = tracer.getTraceHistory(span.traceId);
      expect(history.length).toBe(1);
      expect(history[0].spanId).toBe(span.spanId);
    });
  });

  describe('PrometheusAndOtelExporter', () => {
    it('Prometheus 形式のメトリクス文字列および OpenTelemetry JSON を生成できること', () => {
      const tracer = new DistributedTracer();
      const exporter = new PrometheusAndOtelExporter(tracer);

      exporter.incrementRequests();
      exporter.recordError();

      const span = tracer.startSpan('http_request', 'HTTP');
      tracer.finishSpan(span, 'OK');

      const metricsStr = exporter.exportMetrics();
      expect(metricsStr).toContain('process_uptime_seconds');
      expect(metricsStr).toContain('http_active_requests 1');
      expect(metricsStr).toContain('app_total_errors_total 1');

      const otelJson = exporter.exportOpenTelemetryJson() as { resourceSpans: unknown[] };
      expect(otelJson.resourceSpans).toBeDefined();
      expect(otelJson.resourceSpans.length).toBe(1);
    });
  });

  describe('AlertingMonitor', () => {
    it('エラー率およびレイテンシの閾値超過を判定してアラートイベントを発行できること', () => {
      const tracer = new DistributedTracer();
      const monitor = new AlertingMonitor(tracer);

      // エラー率閾値超過させるためにエラーSpanを追加
      const span1 = tracer.startSpan('s1', 'INTERNAL');
      tracer.finishSpan(span1, 'ERROR');

      const span2 = tracer.startSpan('s2', 'INTERNAL');
      tracer.finishSpan(span2, 'ERROR');

      const alerts = monitor.evaluateRules();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].ruleName).toContain('Error Rate');
    });
  });

  describe('DiagnosticsTimeline', () => {
    it('リクエストタイムラインおよび依存関係グラフを生成できること', () => {
      const tracer = new DistributedTracer();
      const diagnostics = new DiagnosticsTimeline(tracer);

      const span = tracer.startSpan('database_query', 'CACHE');
      tracer.finishSpan(span, 'OK');

      const timeline = diagnostics.getRequestTimeline(span.traceId);
      expect(timeline).not.toBeNull();
      expect(timeline?.spansCount).toBe(1);
      expect(timeline?.timeline[0].name).toBe('database_query');

      const graph = diagnostics.getDependencyGraph();
      expect(graph.length).toBe(1);
      expect(graph[0].id).toBe('database_query');
      expect(graph[0].type).toBe('CACHE');
    });
  });

  describe('MonitoringMiddleware Integration', () => {
    it('リクエストに Header を付与し finish イベント時に Logger と Tracer が呼び出されること', () => {
      const logger = new StructuredLogger();
      const tracer = new DistributedTracer();
      const exporter = new PrometheusAndOtelExporter(tracer);
      const middleware = new MonitoringMiddleware(logger, tracer, exporter);

      const req = {
        method: 'GET',
        path: '/api/metadata',
        headers: {},
      } as unknown as RequestWithTrace;

      const setHeaderFn = vi.fn();
      let finishCallback: () => void = () => {};
      const onFn = vi.fn((event: string, cb: () => void) => {
        if (event === 'finish') {
          finishCallback = cb;
        }
      });

      const res = { setHeader: setHeaderFn, on: onFn, statusCode: 200 } as unknown as Response;
      const next = vi.fn();

      middleware.handle()(req, res, next);

      expect(setHeaderFn).toHaveBeenCalledWith('X-Trace-ID', expect.any(String));
      expect(setHeaderFn).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
      expect(next).toHaveBeenCalledTimes(1);

      // finish イベント発行模擬
      finishCallback();

      const history = tracer.getTraceHistory();
      expect(history.length).toBe(1);
      expect(history[0].name).toBe('GET /api/metadata');
    });
  });
});

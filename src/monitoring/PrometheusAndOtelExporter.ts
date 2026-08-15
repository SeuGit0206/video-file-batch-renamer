import type { DistributedTracer, Span } from './DistributedTracer';

export interface RuntimeMetrics {
  uptimeSeconds: number;
  nodeVersion: string;
  memoryRssBytes: number;
  heapTotalBytes: number;
  heapUsedBytes: number;
  activeRequests: number;
  errorCount: number;
}

export interface IPrometheusExporter {
  exportMetrics(): string;
  exportOpenTelemetryJson(): object;
  recordError(): void;
  incrementRequests(): void;
  decrementRequests(): void;
}

export class PrometheusAndOtelExporter implements IPrometheusExporter {
  private tracer: DistributedTracer;
  private errorCounter = 0;
  private activeRequestGauge = 0;

  constructor(tracer: DistributedTracer) {
    this.tracer = tracer;
  }

  public recordError(): void {
    this.errorCounter++;
  }

  public incrementRequests(): void {
    this.activeRequestGauge++;
  }

  public decrementRequests(): void {
    if (this.activeRequestGauge > 0) {
      this.activeRequestGauge--;
    }
  }

  public getRuntimeMetrics(): RuntimeMetrics {
    const mem = process.memoryUsage();
    return {
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      memoryRssBytes: mem.rss,
      heapTotalBytes: mem.heapTotal,
      heapUsedBytes: mem.heapUsed,
      activeRequests: this.activeRequestGauge,
      errorCount: this.errorCounter,
    };
  }

  public exportMetrics(): string {
    const runtime = this.getRuntimeMetrics();
    const spans = this.tracer.getTraceHistory();

    const totalSpans = spans.length;
    const errorSpans = spans.filter((s) => s.status === 'ERROR').length;
    const avgDuration =
      totalSpans > 0
        ? spans.reduce((acc, s) => acc + (s.durationMs || 0), 0) / totalSpans
        : 0;

    return [
      `# HELP process_uptime_seconds Process uptime in seconds.`,
      `# TYPE process_uptime_seconds gauge`,
      `process_uptime_seconds ${runtime.uptimeSeconds}`,
      `# HELP nodejs_heap_size_total_bytes Process heap total in bytes.`,
      `# TYPE nodejs_heap_size_total_bytes gauge`,
      `nodejs_heap_size_total_bytes ${runtime.heapTotalBytes}`,
      `# HELP nodejs_heap_size_used_bytes Process heap used in bytes.`,
      `# TYPE nodejs_heap_size_used_bytes gauge`,
      `nodejs_heap_size_used_bytes ${runtime.heapUsedBytes}`,
      `# HELP http_active_requests Current active requests.`,
      `# TYPE http_active_requests gauge`,
      `http_active_requests ${runtime.activeRequests}`,
      `# HELP app_total_errors_total Total recorded errors.`,
      `# TYPE app_total_errors_total counter`,
      `app_total_errors_total ${runtime.errorCount}`,
      `# HELP app_spans_total Total spans recorded.`,
      `# TYPE app_spans_total counter`,
      `app_spans_total ${totalSpans}`,
      `# HELP app_spans_errors_total Total error spans recorded.`,
      `# TYPE app_spans_errors_total counter`,
      `app_spans_errors_total ${errorSpans}`,
      `# HELP app_spans_avg_duration_ms Average span duration in ms.`,
      `# TYPE app_spans_avg_duration_ms gauge`,
      `app_spans_avg_duration_ms ${avgDuration.toFixed(2)}`,
    ].join('\n');
  }

  public exportOpenTelemetryJson(): object {
    const spans = this.tracer.getTraceHistory();
    return {
      resourceSpans: [
        {
          resource: {
            attributes: [
              { key: 'service.name', value: { stringValue: 'scraper-service' } },
              { key: 'process.pid', value: { intValue: process.pid } },
            ],
          },
          scopeSpans: [
            {
              scope: { name: 'scraper-tracer' },
              spans: spans.map((s: Span) => ({
                traceId: s.traceId,
                spanId: s.spanId,
                name: s.name,
                kind: s.kind,
                startTimeUnixNano: s.startTimeMs * 1000000,
                endTimeUnixNano: (s.endTimeMs || s.startTimeMs) * 1000000,
                status: { code: s.status === 'OK' ? 1 : 2, message: s.errorMessage || '' },
                attributes: Object.entries(s.tags).map(([k, v]) => ({
                  key: k,
                  value: { stringValue: String(v) },
                })),
              })),
            },
          ],
        },
      ],
    };
  }
}

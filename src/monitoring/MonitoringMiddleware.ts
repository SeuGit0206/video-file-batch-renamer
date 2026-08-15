import type { Request, Response, NextFunction } from 'express';
import { StructuredLogger, type TraceContext } from './StructuredLogger';
import type { DistributedTracer, Span } from './DistributedTracer';
import type { PrometheusAndOtelExporter } from './PrometheusAndOtelExporter';

export interface RequestWithTrace extends Request {
  traceContext?: TraceContext;
  currentSpan?: Span;
}

export class MonitoringMiddleware {
  private logger: StructuredLogger;
  private tracer: DistributedTracer;
  private exporter: PrometheusAndOtelExporter;

  constructor(
    logger: StructuredLogger,
    tracer: DistributedTracer,
    exporter: PrometheusAndOtelExporter
  ) {
    this.logger = logger;
    this.tracer = tracer;
    this.exporter = exporter;
  }

  public handle() {
    return (req: RequestWithTrace, res: Response, next: NextFunction): void => {
      const incomingCorrelationId =
        (req.headers['x-correlation-id'] as string) || (req.headers['x-request-id'] as string);

      const traceContext = StructuredLogger.createTraceContext(incomingCorrelationId);
      req.traceContext = traceContext;

      // レスポンスヘッダーにトレーシングIDを付与
      res.setHeader('X-Trace-ID', traceContext.traceId);
      res.setHeader('X-Request-ID', traceContext.requestId);
      if (traceContext.correlationId) {
        res.setHeader('X-Correlation-ID', traceContext.correlationId);
      }

      this.exporter.incrementRequests();
      const span = this.tracer.startSpan(`${req.method} ${req.path}`, 'HTTP', traceContext);
      req.currentSpan = span;

      this.logger.info(`HTTP Request Started: ${req.method} ${req.path}`, traceContext);

      res.on('finish', () => {
        this.exporter.decrementRequests();

        const isError = res.statusCode >= 400;
        if (isError) {
          this.exporter.recordError();
        }

        this.tracer.finishSpan(span, isError ? 'ERROR' : 'OK', isError ? `HTTP ${res.statusCode}` : undefined);

        this.logger.info(`HTTP Request Finished: ${req.method} ${req.path} [${res.statusCode}]`, {
          ...traceContext,
          statusCode: res.statusCode,
          durationMs: span.durationMs,
        });
      });

      next();
    };
  }
}

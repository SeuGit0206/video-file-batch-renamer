import crypto from 'crypto';

export interface TraceContext {
  traceId: string;
  requestId: string;
  correlationId?: string;
  parentSpanId?: string;
  [key: string]: unknown;
}

export interface LogContext extends Partial<TraceContext> {
  [key: string]: unknown;
}

export interface IStructuredLogger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
}

export class StructuredLogger implements IStructuredLogger {
  private serviceName: string;

  constructor(serviceName: string = 'scraper-service') {
    this.serviceName = serviceName;
  }

  public static createTraceContext(correlationId?: string): TraceContext {
    return {
      traceId: crypto.randomUUID(),
      requestId: crypto.randomUUID(),
      correlationId: correlationId || crypto.randomUUID(),
    };
  }

  private format(level: string, message: string, error?: Error, context?: LogContext): string {
    const entry = {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      level,
      message,
      ...(error ? { error: { name: error.name, message: error.message, stack: error.stack } } : {}),
      ...context,
    };
    return JSON.stringify(entry);
  }

  public info(message: string, context?: LogContext): void {
    console.log(this.format('INFO', message, undefined, context));
  }

  public warn(message: string, context?: LogContext): void {
    console.warn(this.format('WARN', message, undefined, context));
  }

  public error(message: string, error?: Error, context?: LogContext): void {
    console.error(this.format('ERROR', message, error, context));
  }

  public debug(message: string, context?: LogContext): void {
    console.debug(this.format('DEBUG', message, undefined, context));
  }
}

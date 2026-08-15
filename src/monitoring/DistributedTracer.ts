import crypto from 'crypto';
import type { TraceContext } from './StructuredLogger';

export interface Span {
  spanId: string;
  traceId: string;
  name: string;
  kind: 'PIPELINE' | 'PROVIDER' | 'CACHE' | 'HTTP' | 'INTERNAL';
  startTimeMs: number;
  endTimeMs?: number;
  durationMs?: number;
  tags: Record<string, string | number | boolean>;
  status: 'OK' | 'ERROR';
  errorMessage?: string;
}

export interface IDistributedTracer {
  startSpan(name: string, kind?: Span['kind'], parentContext?: TraceContext): Span;
  finishSpan(span: Span, status?: 'OK' | 'ERROR', errorMessage?: string): void;
  getActiveSpans(): Span[];
  getTraceHistory(traceId?: string): Span[];
  clear(): void;
}

export class DistributedTracer implements IDistributedTracer {
  private spans: Span[] = [];
  private maxStoredSpans: number;

  constructor(maxStoredSpans: number = 2000) {
    this.maxStoredSpans = maxStoredSpans;
  }

  public startSpan(
    name: string,
    kind: Span['kind'] = 'INTERNAL',
    parentContext?: TraceContext
  ): Span {
    const span: Span = {
      spanId: crypto.randomUUID().substring(0, 8),
      traceId: parentContext?.traceId || crypto.randomUUID(),
      name,
      kind,
      startTimeMs: Date.now(),
      tags: {
        requestId: parentContext?.requestId || '',
        correlationId: parentContext?.correlationId || '',
      },
      status: 'OK',
    };

    if (this.spans.length >= this.maxStoredSpans) {
      this.spans.shift();
    }
    this.spans.push(span);
    return span;
  }

  public finishSpan(span: Span, status: 'OK' | 'ERROR' = 'OK', errorMessage?: string): void {
    span.endTimeMs = Date.now();
    span.durationMs = span.endTimeMs - span.startTimeMs;
    span.status = status;
    if (errorMessage) {
      span.errorMessage = errorMessage;
    }
  }

  public getActiveSpans(): Span[] {
    return this.spans.filter((s) => s.endTimeMs === undefined);
  }

  public getTraceHistory(traceId?: string): Span[] {
    if (traceId) {
      return this.spans.filter((s) => s.traceId === traceId);
    }
    return [...this.spans];
  }

  public clear(): void {
    this.spans = [];
  }
}

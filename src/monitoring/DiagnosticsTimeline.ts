import type { DistributedTracer } from './DistributedTracer';

export interface TimelineEntry {
  spanId: string;
  name: string;
  kind: string;
  relativeStartMs: number;
  durationMs: number;
  status: 'OK' | 'ERROR';
}

export interface RequestTimeline {
  traceId: string;
  totalDurationMs: number;
  spansCount: number;
  timeline: TimelineEntry[];
}

export interface DependencyGraphNode {
  id: string;
  label: string;
  type: string;
  callCount: number;
  avgDurationMs: number;
  errorCount: number;
}

export class DiagnosticsTimeline {
  private tracer: DistributedTracer;

  constructor(tracer: DistributedTracer) {
    this.tracer = tracer;
  }

  public getRequestTimeline(traceId: string): RequestTimeline | null {
    const spans = this.tracer.getTraceHistory(traceId);
    if (spans.length === 0) return null;

    const minStart = Math.min(...spans.map((s) => s.startTimeMs));
    const maxEnd = Math.max(...spans.map((s) => s.endTimeMs || s.startTimeMs));

    const timeline: TimelineEntry[] = spans.map((s) => ({
      spanId: s.spanId,
      name: s.name,
      kind: s.kind,
      relativeStartMs: s.startTimeMs - minStart,
      durationMs: s.durationMs || 0,
      status: s.status,
    }));

    return {
      traceId,
      totalDurationMs: maxEnd - minStart,
      spansCount: spans.length,
      timeline,
    };
  }

  public getDependencyGraph(): DependencyGraphNode[] {
    const spans = this.tracer.getTraceHistory();
    const map = new Map<string, { callCount: number; totalDuration: number; errors: number; kind: string }>();

    for (const span of spans) {
      const key = span.name;
      const current = map.get(key) || { callCount: 0, totalDuration: 0, errors: 0, kind: span.kind };
      current.callCount++;
      current.totalDuration += span.durationMs || 0;
      if (span.status === 'ERROR') {
        current.errors++;
      }
      map.set(key, current);
    }

    const nodes: DependencyGraphNode[] = [];
    for (const [name, data] of map.entries()) {
      nodes.push({
        id: name,
        label: name,
        type: data.kind,
        callCount: data.callCount,
        avgDurationMs: data.callCount > 0 ? data.totalDuration / data.callCount : 0,
        errorCount: data.errors,
      });
    }

    return nodes;
  }
}

import type { DistributedTracer } from './DistributedTracer';

export interface AlertRule {
  id: string;
  name: string;
  type: 'ERROR_RATE' | 'LATENCY' | 'CIRCUIT_BREAKER';
  threshold: number; // 例: ErrorRate > 0.15 (15%), Latency > 3000ms
  windowMs: number;
}

export interface AlertEvent {
  ruleId: string;
  ruleName: string;
  triggeredAt: number;
  currentValue: number;
  threshold: number;
  message: string;
}

export class AlertingMonitor {
  private tracer: DistributedTracer;
  private rules: AlertRule[] = [];
  private activeAlerts: AlertEvent[] = [];

  constructor(tracer: DistributedTracer) {
    this.tracer = tracer;
    this.registerDefaultRules();
  }

  private registerDefaultRules(): void {
    this.rules.push(
      {
        id: 'rule-error-rate',
        name: 'High Error Rate Alert',
        type: 'ERROR_RATE',
        threshold: 0.1, // > 10%
        windowMs: 60000,
      },
      {
        id: 'rule-high-latency',
        name: 'High Latency Alert',
        type: 'LATENCY',
        threshold: 5000, // > 5000ms
        windowMs: 60000,
      }
    );
  }

  public addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  public evaluateRules(): AlertEvent[] {
    const now = Date.now();
    const allSpans = this.tracer.getTraceHistory();
    const newAlerts: AlertEvent[] = [];

    for (const rule of this.rules) {
      const windowSpans = allSpans.filter(
        (s) => s.startTimeMs >= now - rule.windowMs && s.endTimeMs !== undefined
      );

      if (windowSpans.length === 0) continue;

      if (rule.type === 'ERROR_RATE') {
        const errors = windowSpans.filter((s) => s.status === 'ERROR').length;
        const errorRate = errors / windowSpans.length;

        if (errorRate > rule.threshold) {
          newAlerts.push({
            ruleId: rule.id,
            ruleName: rule.name,
            triggeredAt: now,
            currentValue: errorRate,
            threshold: rule.threshold,
            message: `Error rate is ${(errorRate * 100).toFixed(1)}%, exceeding threshold of ${(rule.threshold * 100).toFixed(1)}%`,
          });
        }
      } else if (rule.type === 'LATENCY') {
        const totalDuration = windowSpans.reduce((acc, s) => acc + (s.durationMs || 0), 0);
        const avgLatency = totalDuration / windowSpans.length;

        if (avgLatency > rule.threshold) {
          newAlerts.push({
            ruleId: rule.id,
            ruleName: rule.name,
            triggeredAt: now,
            currentValue: avgLatency,
            threshold: rule.threshold,
            message: `Average latency is ${avgLatency.toFixed(0)}ms, exceeding threshold of ${rule.threshold}ms`,
          });
        }
      }
    }

    this.activeAlerts = newAlerts;
    return newAlerts;
  }

  public getActiveAlerts(): AlertEvent[] {
    return this.activeAlerts;
  }
}

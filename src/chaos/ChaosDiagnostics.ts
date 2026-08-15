import type { ChaosConfig } from './ChaosInjector';
import type { FaultToleranceValidationReport } from './FaultToleranceValidator';

export interface FailureTimelineEvent {
  id: string;
  timestamp: string;
  type: 'CHAOS_INJECTED' | 'FAILURE_DETECTED' | 'RECOVERY_ATTEMPTED' | 'RECOVERY_SUCCEEDED' | 'RECOVERY_FAILED';
  component: string;
  details: string;
}

export interface ChaosReport {
  generatedAt: string;
  config: ChaosConfig;
  totalInjectedFailures: number;
  totalRecoveredFailures: number;
  recoveryRate: number;
  validationReport?: FaultToleranceValidationReport;
}

export interface RecoveryReport {
  generatedAt: string;
  totalRecoveryAttempts: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  usedFallbacksCount: number;
  timeline: FailureTimelineEvent[];
}

export interface IChaosDiagnostics {
  recordEvent(
    type: FailureTimelineEvent['type'],
    component: string,
    details: string
  ): void;
  getTimeline(): FailureTimelineEvent[];
  generateChaosReport(
    config: ChaosConfig,
    validationReport?: FaultToleranceValidationReport
  ): ChaosReport;
  generateRecoveryReport(): RecoveryReport;
  clear(): void;
}

export class ChaosDiagnostics implements IChaosDiagnostics {
  private events: FailureTimelineEvent[] = [];

  public recordEvent(
    type: FailureTimelineEvent['type'],
    component: string,
    details: string
  ): void {
    this.events.push({
      id: Math.random().toString(36).substring(2, 10),
      timestamp: new Date().toISOString(),
      type,
      component,
      details,
    });
  }

  public getTimeline(): FailureTimelineEvent[] {
    return [...this.events];
  }

  public generateChaosReport(
    config: ChaosConfig,
    validationReport?: FaultToleranceValidationReport
  ): ChaosReport {
    const injected = this.events.filter((e) => e.type === 'CHAOS_INJECTED').length;
    const recovered = this.events.filter((e) => e.type === 'RECOVERY_SUCCEEDED').length;

    return {
      generatedAt: new Date().toISOString(),
      config,
      totalInjectedFailures: injected,
      totalRecoveredFailures: recovered,
      recoveryRate: injected > 0 ? Math.round((recovered / injected) * 100) / 100 : 1.0,
      validationReport,
    };
  }

  public generateRecoveryReport(): RecoveryReport {
    const recoveryAttempts = this.events.filter((e) => e.type === 'RECOVERY_ATTEMPTED').length;
    const successfulRecoveries = this.events.filter((e) => e.type === 'RECOVERY_SUCCEEDED').length;
    const failedRecoveries = this.events.filter((e) => e.type === 'RECOVERY_FAILED').length;
    const usedFallbacksCount = this.events.filter(
      (e) => e.details.includes('Fallback') || e.details.includes('fallback')
    ).length;

    return {
      generatedAt: new Date().toISOString(),
      totalRecoveryAttempts: recoveryAttempts,
      successfulRecoveries,
      failedRecoveries,
      usedFallbacksCount,
      timeline: [...this.events],
    };
  }

  public clear(): void {
    this.events = [];
  }
}

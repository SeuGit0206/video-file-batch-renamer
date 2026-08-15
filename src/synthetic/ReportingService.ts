import type { ISyntheticMonitor, SyntheticCheckResult } from './SyntheticMonitor';
import type { IVerificationEngine, VerificationRunResult } from './VerificationEngine';

export interface VerificationReport {
  generatedAt: string;
  totalScenariosRun: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  runs: VerificationRunResult[];
}

export interface HealthReport {
  generatedAt: string;
  systemStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  checks: SyntheticCheckResult[];
}

export interface MonitoringSummary {
  generatedAt: string;
  healthReport: HealthReport;
  verificationReport: VerificationReport;
  overallScorePercentage: number;
}

export interface IReportingService {
  generateVerificationReport(): VerificationReport;
  generateHealthReport(): HealthReport;
  generateMonitoringSummary(): MonitoringSummary;
}

export class ReportingService implements IReportingService {
  private monitor: ISyntheticMonitor;
  private verificationEngine: IVerificationEngine;

  constructor(monitor: ISyntheticMonitor, verificationEngine: IVerificationEngine) {
    this.monitor = monitor;
    this.verificationEngine = verificationEngine;
  }

  public generateVerificationReport(): VerificationReport {
    const runs = this.verificationEngine.getRunHistory();
    const passed = runs.filter((r) => r.passed).length;
    const failed = runs.length - passed;
    const passRate = runs.length > 0 ? Math.round((passed / runs.length) * 100) / 100 : 1.0;

    return {
      generatedAt: new Date().toISOString(),
      totalScenariosRun: runs.length,
      passedCount: passed,
      failedCount: failed,
      passRate,
      runs,
    };
  }

  public generateHealthReport(): HealthReport {
    const checks = this.monitor.getCheckHistory();
    const passed = checks.filter((c) => c.status === 'PASS').length;
    const failed = checks.length - passed;

    let systemStatus: HealthReport['systemStatus'] = 'HEALTHY';
    if (failed > 0 && failed < checks.length) {
      systemStatus = 'DEGRADED';
    } else if (failed >= checks.length && checks.length > 0) {
      systemStatus = 'UNHEALTHY';
    }

    return {
      generatedAt: new Date().toISOString(),
      systemStatus,
      totalChecks: checks.length,
      passedChecks: passed,
      failedChecks: failed,
      checks,
    };
  }

  public generateMonitoringSummary(): MonitoringSummary {
    const healthReport = this.generateHealthReport();
    const verificationReport = this.generateVerificationReport();

    const totalTotal = healthReport.totalChecks + verificationReport.totalScenariosRun;
    const totalPassed = healthReport.passedChecks + verificationReport.passedCount;
    const score = totalTotal > 0 ? Math.round((totalPassed / totalTotal) * 100) : 100;

    return {
      generatedAt: new Date().toISOString(),
      healthReport,
      verificationReport,
      overallScorePercentage: score,
    };
  }
}

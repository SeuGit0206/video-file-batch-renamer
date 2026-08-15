import type { IReleaseReadinessReportGenerator, ReleaseReadinessReport } from './ReleaseReadinessReportGenerator';

export interface OperationalDashboardMetrics {
  uptimeSeconds: number;
  memoryUsageMb: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
  nodeVersion: string;
  environment: string;
  lastReport?: ReleaseReadinessReport;
  timestamp: string;
}

export interface IOperationalDashboardBackend {
  getDashboardMetrics(): Promise<OperationalDashboardMetrics>;
  generateFreshReadinessReport(): Promise<ReleaseReadinessReport>;
}

export class OperationalDashboardBackend implements IOperationalDashboardBackend {
  private reportGenerator: IReleaseReadinessReportGenerator;
  private cachedReport?: ReleaseReadinessReport;

  constructor(reportGenerator: IReleaseReadinessReportGenerator) {
    this.reportGenerator = reportGenerator;
  }

  public async getDashboardMetrics(): Promise<OperationalDashboardMetrics> {
    const mem = process.memoryUsage();

    if (!this.cachedReport) {
      this.cachedReport = await this.reportGenerator.generateReport();
    }

    return {
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMb: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024),
      },
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      lastReport: this.cachedReport,
      timestamp: new Date().toISOString(),
    };
  }

  public async generateFreshReadinessReport(): Promise<ReleaseReadinessReport> {
    this.cachedReport = await this.reportGenerator.generateReport();
    return this.cachedReport;
  }
}

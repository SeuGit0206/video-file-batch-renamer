import type { ISyntheticMonitor } from './SyntheticMonitor';
import type { IVerificationEngine } from './VerificationEngine';
import type { IFeatureFlagService } from '../config';

export interface IMonitoringScheduler {
  startSchedule(intervalMs?: number): void;
  stopSchedule(): void;
  isRunning(): boolean;
  triggerManualRun(): Promise<void>;
}

export class MonitoringScheduler implements IMonitoringScheduler {
  private monitor: ISyntheticMonitor;
  private verificationEngine: IVerificationEngine;
  private featureFlagService?: IFeatureFlagService;
  private timer: NodeJS.Timeout | null = null;
  private active = false;

  constructor(
    monitor: ISyntheticMonitor,
    verificationEngine: IVerificationEngine,
    featureFlagService?: IFeatureFlagService
  ) {
    this.monitor = monitor;
    this.verificationEngine = verificationEngine;
    this.featureFlagService = featureFlagService;
  }

  private isEnabled(): boolean {
    if (!this.featureFlagService) return true;
    return this.featureFlagService.isEnabled('ENABLE_SYNTHETIC_MONITORING');
  }

  public startSchedule(intervalMs: number = 60000): void {
    if (this.active) return;
    this.active = true;

    this.timer = setInterval(async () => {
      if (!this.isEnabled()) return;
      await this.triggerManualRun();
    }, intervalMs);
  }

  public stopSchedule(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.active = false;
  }

  public isRunning(): boolean {
    return this.active;
  }

  public async triggerManualRun(): Promise<void> {
    if (!this.isEnabled()) return;

    await this.monitor.runHealthCheck();
    await this.monitor.runApiCheck('/api/health');
    await this.verificationEngine.runAllScenarios();
  }
}

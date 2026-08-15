import type { IFeatureFlagService } from '../config';

export interface ChaosConfig {
  enabled: boolean;
  delayMs?: number;
  httpErrorCode?: number;
  timeoutMs?: number;
  failureRate?: number; // 0.0 ~ 1.0
}

export interface IChaosInjector {
  setConfig(config: Partial<ChaosConfig>): void;
  getConfig(): ChaosConfig;
  injectDelayIfNeeded(): Promise<void>;
  maybeInjectHttpError(): void;
  maybeInjectTimeout(): Promise<void>;
  maybeInjectRandomFailure(): void;
}

export class ChaosInjector implements IChaosInjector {
  private featureFlagService?: IFeatureFlagService;
  private config: ChaosConfig = {
    enabled: false,
    delayMs: 0,
    httpErrorCode: 500,
    timeoutMs: 0,
    failureRate: 0,
  };

  constructor(featureFlagService?: IFeatureFlagService, initialConfig?: Partial<ChaosConfig>) {
    this.featureFlagService = featureFlagService;
    if (initialConfig) {
      this.config = { ...this.config, ...initialConfig };
    }
  }

  private isChaosActive(): boolean {
    if (this.featureFlagService) {
      const flagEnabled = this.featureFlagService.isEnabled('ENABLE_CHAOS_ENGINEERING') ||
                          this.featureFlagService.isEnabled('ENABLE_CHAOS_INJECTION');
      if (!flagEnabled) return false;
    }
    return this.config.enabled;
  }

  public setConfig(config: Partial<ChaosConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): ChaosConfig {
    return { ...this.config };
  }

  public async injectDelayIfNeeded(): Promise<void> {
    if (!this.isChaosActive() || !this.config.delayMs || this.config.delayMs <= 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, this.config.delayMs));
  }

  public maybeInjectHttpError(): void {
    if (!this.isChaosActive() || !this.config.httpErrorCode) {
      return;
    }
    const err = new Error(`[ChaosInjector] Injected HTTP Error ${this.config.httpErrorCode}`);
    (err as unknown as { statusCode: number }).statusCode = this.config.httpErrorCode;
    throw err;
  }

  public async maybeInjectTimeout(): Promise<void> {
    if (!this.isChaosActive() || !this.config.timeoutMs || this.config.timeoutMs <= 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, this.config.timeoutMs));
    throw new Error(`[ChaosInjector] Operation timed out after ${this.config.timeoutMs}ms`);
  }

  public maybeInjectRandomFailure(): void {
    if (!this.isChaosActive() || !this.config.failureRate || this.config.failureRate <= 0) {
      return;
    }
    if (Math.random() < this.config.failureRate) {
      throw new Error(`[ChaosInjector] Injected Random Failure (rate: ${this.config.failureRate})`);
    }
  }
}

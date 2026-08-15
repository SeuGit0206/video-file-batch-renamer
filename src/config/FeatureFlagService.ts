import type { IEnvironmentProvider } from './EnvironmentProvider';
import { EnvironmentProvider } from './EnvironmentProvider';
import type { ILogger } from '../services';

export type FeatureFlag =
  | 'ENABLE_CACHE'
  | 'ENABLE_STEALTH'
  | 'ENABLE_METRICS'
  | 'ENABLE_DIAGNOSTICS'
  | 'USE_LITE_DB'
  | string;

export type FeatureFlagChangeListener = (flagKey: string, enabled: boolean) => void;

export interface IFeatureFlagService {
  isEnabled(flagKey: FeatureFlag): boolean;
  setFlag(flagKey: FeatureFlag, enabled: boolean): void;
  toggleFlag(flagKey: FeatureFlag): boolean;
  getAllFlags(): Record<string, boolean>;
  onFlagChange(listener: FeatureFlagChangeListener): () => void;
}

export class FeatureFlagService implements IFeatureFlagService {
  private flags: Map<string, boolean> = new Map();
  private logger?: ILogger;
  private listeners: Set<FeatureFlagChangeListener> = new Set();

  constructor(envProvider?: IEnvironmentProvider, logger?: ILogger) {
    this.logger = logger;
    const provider = envProvider || new EnvironmentProvider();
    this.initializeDefaultFlags(provider);
  }

  private initializeDefaultFlags(envProvider: IEnvironmentProvider): void {
    // デフォルトフラグの設定
    this.flags.set('ENABLE_CACHE', envProvider.getBoolean('ENABLE_CACHE', true));
    this.flags.set('ENABLE_STEALTH', envProvider.getBoolean('ENABLE_STEALTH', true));
    this.flags.set('ENABLE_METRICS', envProvider.getBoolean('ENABLE_METRICS', true));
    this.flags.set('ENABLE_DIAGNOSTICS', envProvider.getBoolean('ENABLE_DIAGNOSTICS', true));
    this.flags.set('USE_LITE_DB', envProvider.getBoolean('USE_LITE_DB', true));

    // FEATURE_FLAGS 環境変数から追加読み込み (カンマ区切り: "FEATURE_A=true,FEATURE_B=false")
    const customFlagsStr = envProvider.get('FEATURE_FLAGS', '');
    if (customFlagsStr.trim()) {
      const pairs = customFlagsStr.split(',');
      for (const pair of pairs) {
        const [key, val] = pair.split('=').map((s) => s.trim());
        if (key) {
          const enabled = val?.toLowerCase() === 'true' || val === '1';
          this.flags.set(key, enabled);
        }
      }
    }
  }

  public isEnabled(flagKey: FeatureFlag): boolean {
    return this.flags.get(flagKey) ?? false;
  }

  public setFlag(flagKey: FeatureFlag, enabled: boolean): void {
    const prev = this.flags.get(flagKey);
    if (prev !== enabled) {
      this.flags.set(flagKey, enabled);
      if (this.logger) {
        this.logger.info(`[FeatureFlag] Flag '${flagKey}' changed to ${enabled}`);
      }
      this.notifyListeners(flagKey, enabled);
    }
  }

  public toggleFlag(flagKey: FeatureFlag): boolean {
    const current = this.isEnabled(flagKey);
    const next = !current;
    this.setFlag(flagKey, next);
    return next;
  }

  public getAllFlags(): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const [key, val] of this.flags.entries()) {
      result[key] = val;
    }
    return result;
  }

  public onFlagChange(listener: FeatureFlagChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(flagKey: string, enabled: boolean): void {
    for (const listener of this.listeners) {
      try {
        listener(flagKey, enabled);
      } catch (error) {
        if (this.logger) {
          this.logger.error(`[FeatureFlag] Listener error on flag '${flagKey}':`, error instanceof Error ? error.message : String(error));
        }
      }
    }
  }
}

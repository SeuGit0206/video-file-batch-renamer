import type { AppConfig } from './ConfigValidator';
import { ConfigValidator } from './ConfigValidator';
import type { IEnvironmentProvider } from './EnvironmentProvider';
import { EnvironmentProvider } from './EnvironmentProvider';
import type { ILogger } from '../services';

export type ConfigChangeListener = (newConfig: AppConfig, prevConfig: AppConfig) => void;

export interface IRuntimeConfigurationProvider {
  getConfig(): AppConfig;
  updateConfig(partialConfig: Partial<AppConfig>): AppConfig;
  onConfigChange(listener: ConfigChangeListener): () => void;
  reloadFromEnvironment(): AppConfig;
}

export class RuntimeConfigurationProvider implements IRuntimeConfigurationProvider {
  private config: AppConfig;
  private envProvider: IEnvironmentProvider;
  private logger?: ILogger;
  private listeners: Set<ConfigChangeListener> = new Set();

  constructor(envProvider?: IEnvironmentProvider, logger?: ILogger) {
    this.envProvider = envProvider || new EnvironmentProvider();
    this.logger = logger;
    this.config = this.buildConfigFromEnv();
    ConfigValidator.validate(this.config);
  }

  private buildConfigFromEnv(): AppConfig {
    return {
      app: {
        name: this.envProvider.get('APP_NAME', 'file-renamer-scraper'),
        version: this.envProvider.get('APP_VERSION', '1.0.0'),
        port: this.envProvider.getNumber('PORT', 3000),
        env: this.envProvider.get('NODE_ENV', 'development'),
      },
      scraping: {
        timeoutMs: this.envProvider.getNumber('SCRAPING_TIMEOUT_MS', 30000),
        maxRetries: this.envProvider.getNumber('MAX_RETRY_COUNT', 3),
        enableStealth: this.envProvider.getBoolean('ENABLE_STEALTH', true),
      },
      cache: {
        enabled: this.envProvider.getBoolean('ENABLE_CACHE', true),
        ttlSeconds: this.envProvider.getNumber('CACHE_TTL_SECONDS', 86400),
      },
      resilience: {
        circuitBreakerThreshold: this.envProvider.getNumber('CIRCUIT_BREAKER_THRESHOLD', 5),
        rateLimitMax: this.envProvider.getNumber('RATE_LIMIT_MAX', 100),
        rateLimitWindowMs: this.envProvider.getNumber('RATE_LIMIT_WINDOW_MS', 60000),
      },
    };
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }

  public updateConfig(partialConfig: Partial<AppConfig>): AppConfig {
    const prevConfig = this.config;
    const mergedConfig: AppConfig = {
      app: { ...prevConfig.app, ...partialConfig.app },
      scraping: { ...prevConfig.scraping, ...partialConfig.scraping },
      cache: { ...prevConfig.cache, ...partialConfig.cache },
      resilience: { ...prevConfig.resilience, ...partialConfig.resilience },
    };

    ConfigValidator.validate(mergedConfig);
    this.config = mergedConfig;

    if (this.logger) {
      this.logger.info('[RuntimeConfig] Configuration updated dynamically (Hot Reload)');
    }

    this.notifyListeners(this.config, prevConfig);
    return this.config;
  }

  public reloadFromEnvironment(): AppConfig {
    const newConfig = this.buildConfigFromEnv();
    return this.updateConfig(newConfig);
  }

  public onConfigChange(listener: ConfigChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(newConfig: AppConfig, prevConfig: AppConfig): void {
    for (const listener of this.listeners) {
      try {
        listener(newConfig, prevConfig);
      } catch (error) {
        if (this.logger) {
          this.logger.error('[RuntimeConfig] Listener error during config change:', error instanceof Error ? error.message : String(error));
        }
      }
    }
  }
}

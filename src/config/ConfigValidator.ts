import { BaseAppError } from '../errors';

export class ConfigurationValidationError extends BaseAppError {
  public errors: string[];

  constructor(errors: string[]) {
    super(`Configuration validation failed:\n${errors.join('\n')}`);
    this.name = 'ConfigurationValidationError';
    this.errors = errors;
  }
}

export interface AppConfig {
  app: {
    name: string;
    version: string;
    port: number;
    env: string;
  };
  scraping: {
    timeoutMs: number;
    maxRetries: number;
    enableStealth: boolean;
  };
  cache: {
    enabled: boolean;
    ttlSeconds: number;
  };
  resilience: {
    circuitBreakerThreshold: number;
    rateLimitMax: number;
    rateLimitWindowMs: number;
  };
}

export class ConfigValidator {
  public static validate(config: AppConfig): void {
    const errors: string[] = [];

    if (!config.app.name || config.app.name.trim() === '') {
      errors.push('app.name must be a non-empty string');
    }

    if (config.app.port <= 0 || config.app.port > 65535) {
      errors.push(`app.port must be between 1 and 65535, received: ${config.app.port}`);
    }

    if (config.scraping.timeoutMs <= 0) {
      errors.push(`scraping.timeoutMs must be greater than 0, received: ${config.scraping.timeoutMs}`);
    }

    if (config.scraping.maxRetries < 0) {
      errors.push(`scraping.maxRetries must be >= 0, received: ${config.scraping.maxRetries}`);
    }

    if (config.cache.ttlSeconds <= 0) {
      errors.push(`cache.ttlSeconds must be greater than 0, received: ${config.cache.ttlSeconds}`);
    }

    if (config.resilience.circuitBreakerThreshold <= 0) {
      errors.push(`resilience.circuitBreakerThreshold must be greater than 0, received: ${config.resilience.circuitBreakerThreshold}`);
    }

    if (config.resilience.rateLimitMax <= 0) {
      errors.push(`resilience.rateLimitMax must be greater than 0, received: ${config.resilience.rateLimitMax}`);
    }

    if (errors.length > 0) {
      throw new ConfigurationValidationError(errors);
    }
  }
}

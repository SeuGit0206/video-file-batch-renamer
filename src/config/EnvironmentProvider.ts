export interface EnvironmentVariables {
  NODE_ENV?: string;
  PORT?: string | number;
  CACHE_TTL_SECONDS?: string | number;
  ENABLE_CACHE?: string | boolean;
  MAX_RETRY_COUNT?: string | number;
  FEATURE_FLAGS?: string; // e.g. "USE_LITE_DB=true,ENABLE_STEALTH=true"
  [key: string]: string | number | boolean | undefined;
}

export interface IEnvironmentProvider {
  get(key: string, defaultValue?: string): string;
  getNumber(key: string, defaultValue?: number): number;
  getBoolean(key: string, defaultValue?: boolean): boolean;
  getAll(): EnvironmentVariables;
}

export class EnvironmentProvider implements IEnvironmentProvider {
  private env: Record<string, string | undefined>;

  constructor(envSource?: Record<string, string | undefined>) {
    this.env = envSource || process.env;
  }

  public get(key: string, defaultValue: string = ''): string {
    const value = this.env[key];
    return value !== undefined ? value : defaultValue;
  }

  public getNumber(key: string, defaultValue: number = 0): number {
    const value = this.env[key];
    if (value === undefined || value === '') {
      return defaultValue;
    }
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  public getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = this.env[key];
    if (value === undefined || value === '') {
      return defaultValue;
    }
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }

  public getAll(): EnvironmentVariables {
    return { ...this.env };
  }
}

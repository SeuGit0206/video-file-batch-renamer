import type { LaunchOptions, BrowserContextOptions, Page, BrowserContext } from 'playwright';

/**
 * ブラウザ設定値インターフェース
 */
export interface BrowserSettings {
  headless?: boolean;
  locale?: string;
  timezoneId?: string;
  viewport?: {
    width: number;
    height: number;
  };
  colorScheme?: 'light' | 'dark' | 'no-preference';
  permissions?: string[];
  executablePath?: string;
  userAgent?: string;
  extraHTTPHeaders?: Record<string, string>;
}

/**
 * SettingsProvider 読み込みオプション
 */
export interface ProviderOptions {
  configPath?: string;
  envPrefix?: string;
}

/**
 * BrowserConfigFactory 設定生成オプション
 */
export interface BrowserConfigOptions {
  settings?: BrowserSettings;
  launchOptionsOverrides?: Partial<LaunchOptions>;
  contextOptionsOverrides?: Partial<BrowserContextOptions>;
}

/**
 * 識別用 ID (hashId) を付与した Page インターフェース
 */
export interface IdentifiedPage extends Page {
  hashId?: string;
}

/**
 * Service 内部生成 Context の所有権識別用フラグを含む BrowserContext 拡張型
 */
export interface OwnedBrowserContext extends BrowserContext {
  isOwnedByService?: boolean;
}


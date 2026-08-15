import { chromium, type LaunchOptions, type BrowserContextOptions } from 'playwright';
import type { BrowserSettings, BrowserConfigOptions } from './types';

/**
 * BrowserSettings を Playwright の起動・コンテキストオプションに変換するファクトリクラス
 */
export class BrowserConfigFactory {
  private settings: BrowserSettings;
  private options: BrowserConfigOptions;

  constructor(options: BrowserConfigOptions = {}) {
    this.options = options;
    this.settings = options.settings ?? {};
  }

  /**
   * Playwright の LaunchOptions を生成します
   */
  public createLaunchOptions(overrides?: Partial<LaunchOptions>): LaunchOptions {
    let defaultExecutablePath: string | undefined = this.settings.executablePath || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    if (!defaultExecutablePath) {
      try {
        defaultExecutablePath = chromium.executablePath();
      } catch {
        // Fallback to undefined if not resolvable
      }
    }

    const baseLaunchOptions: LaunchOptions = {
      headless: this.settings.headless ?? true,
      executablePath: defaultExecutablePath,
    };

    return {
      ...baseLaunchOptions,
      ...this.options.launchOptionsOverrides,
      ...overrides,
    };
  }

  /**
   * Playwright の BrowserContextOptions を生成します
   */
  public createContextOptions(overrides?: Partial<BrowserContextOptions>): BrowserContextOptions {
    const baseContextOptions: BrowserContextOptions = {
      locale: this.settings.locale,
      timezoneId: this.settings.timezoneId,
      viewport: this.settings.viewport,
      colorScheme: this.settings.colorScheme,
      permissions: this.settings.permissions,
      userAgent: this.settings.userAgent,
      extraHTTPHeaders: this.settings.extraHTTPHeaders,
    };

    return {
      ...baseContextOptions,
      ...this.options.contextOptionsOverrides,
      ...overrides,
    };
  }
}

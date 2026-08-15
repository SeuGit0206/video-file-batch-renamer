import { chromium } from 'playwright';
import type { BrowserSettings, ProviderOptions } from './types';
import {
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  DEFAULT_VIEWPORT,
  DEFAULT_USER_AGENT,
  DEFAULT_SEC_CH_UA_HEADERS,
} from '../constants';

/**
 * ブラウザ設定値の読み込みと管理を行うプロバイダークラス
 */
export class BrowserSettingsProvider {
  private options: ProviderOptions;
  private settings: BrowserSettings;

  private static readonly DEFAULT_SETTINGS: BrowserSettings = {
    headless: true,
    locale: DEFAULT_LOCALE,
    timezoneId: DEFAULT_TIMEZONE,
    viewport: { ...DEFAULT_VIEWPORT },
    colorScheme: 'light',
    permissions: ['notifications'],
    userAgent: DEFAULT_USER_AGENT,
    extraHTTPHeaders: { ...DEFAULT_SEC_CH_UA_HEADERS },
  };

  constructor(options: ProviderOptions = {}) {
    this.options = options;
    let defaultExecutablePath: string | undefined = process.env.CHROME_BIN || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    if (!defaultExecutablePath) {
      try {
        defaultExecutablePath = chromium.executablePath();
      } catch {
        // Fallback
      }
    }
    this.settings = {
      ...BrowserSettingsProvider.DEFAULT_SETTINGS,
      ...(defaultExecutablePath && { executablePath: defaultExecutablePath }),
    };
  }

  /**
   * 設定値を初期化・読み込みして最新の BrowserSettings を返します
   */
  public load(): BrowserSettings {
    const envPrefix = this.options.envPrefix ?? 'BROWSER_';

    const envHeadless = process.env[`${envPrefix}HEADLESS`];
    const envLocale = process.env[`${envPrefix}LOCALE`];
    const envTimezoneId = process.env[`${envPrefix}TIMEZONE`];
    let envExecutablePath = process.env[`${envPrefix}EXECUTABLE_PATH`] || process.env.CHROME_BIN;
    if (!envExecutablePath) {
      try {
        envExecutablePath = chromium.executablePath();
      } catch {
        // Fallback
      }
    }

    this.settings = {
      ...BrowserSettingsProvider.DEFAULT_SETTINGS,
      ...(envHeadless !== undefined && { headless: envHeadless === 'true' }),
      ...(envLocale && { locale: envLocale }),
      ...(envTimezoneId && { timezoneId: envTimezoneId }),
      ...(envExecutablePath && { executablePath: envExecutablePath }),
    };

    return this.getSettings();
  }

  /**
   * 現在保持している設定値を返します
   */
  public getSettings(): BrowserSettings {
    return { ...this.settings };
  }
}

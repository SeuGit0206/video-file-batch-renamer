import type { Browser, BrowserContext, BrowserContextOptions } from 'playwright';
import { BrowserSettingsProvider } from '../browser/BrowserSettingsProvider';
import { BrowserConfigFactory } from '../browser/BrowserConfigFactory';

/**
 * BrowserContext 生成の責務を担うインターフェース
 */
export interface IBrowserContextFactory {
  createContextOptions(overrides?: Partial<BrowserContextOptions>): BrowserContextOptions;
  createContext(browser: Browser, overrides?: Partial<BrowserContextOptions>): Promise<BrowserContext>;
}

export interface BrowserContextFactoryOptions {
  settingsProvider?: BrowserSettingsProvider;
  configFactory?: BrowserConfigFactory;
}

/**
 * Playwright の BrowserContextOptions 生成および BrowserContext 生成を担うファクトリクラス
 */
export class BrowserContextFactory implements IBrowserContextFactory {
  private configFactory: BrowserConfigFactory;

  constructor(options?: BrowserContextFactoryOptions) {
    if (options?.configFactory) {
      this.configFactory = options.configFactory;
    } else {
      const settingsProvider = options?.settingsProvider ?? new BrowserSettingsProvider();
      const settings = settingsProvider.getSettings();
      this.configFactory = new BrowserConfigFactory({ settings });
    }
  }

  /**
   * BrowserContextOptions を生成します
   * - UserAgent 設定
   * - Viewport 設定
   * - Locale 設定
   * - Timezone 設定
   * - JavaScript有効設定
   * - HTTPS設定
   * - Cookie / StorageState 読み込み設定
   */
  public createContextOptions(overrides?: Partial<BrowserContextOptions>): BrowserContextOptions {
    const baseOptions = this.configFactory.createContextOptions();

    const defaultOptions: Partial<BrowserContextOptions> = {
      javaScriptEnabled: true,
      ignoreHTTPSErrors: true,
    };

    return {
      ...defaultOptions,
      ...baseOptions,
      ...overrides,
    };
  }

  /**
   * Browser.newContext() を呼び出して BrowserContext を生成します
   */
  public async createContext(
    browser: Browser,
    overrides?: Partial<BrowserContextOptions>
  ): Promise<BrowserContext> {
    const options = this.createContextOptions(overrides);
    return await browser.newContext(options);
  }
}

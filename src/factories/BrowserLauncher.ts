import { chromium, type Browser, type BrowserContext, type LaunchOptions, type BrowserContextOptions } from 'playwright';
import { BrowserSettingsProvider } from '../browser/BrowserSettingsProvider';
import { BrowserConfigFactory } from '../browser/BrowserConfigFactory';
import { LOG_TAGS } from '../constants';
import { BrowserMissingError } from '../errors';
import { LoggingService, type ILogger } from '../services';

export interface BrowserLauncherOptions {
  settingsProvider?: BrowserSettingsProvider;
  configFactory?: BrowserConfigFactory;
  logger?: ILogger;
}

/**
 * ブラウザ起動の責務を担うインターフェース
 */
export interface IBrowserLauncher {
  createLaunchOptions(overrides?: Partial<LaunchOptions>): LaunchOptions;
  launch(overrides?: Partial<LaunchOptions>): Promise<Browser>;
  launchPersistentContext(
    userDataDir: string,
    options?: Partial<LaunchOptions & BrowserContextOptions>
  ): Promise<BrowserContext>;
}

/**
 * Playwright ブラウザ（chromium）の起動および永続コンテキスト起動を担うファクトリクラス
 */
export class BrowserLauncher implements IBrowserLauncher {
  private configFactory: BrowserConfigFactory;
  private logger: ILogger;

  constructor(options?: BrowserLauncherOptions) {
    this.logger = options?.logger ?? LoggingService.getInstance();
    if (options?.configFactory) {
      this.configFactory = options.configFactory;
    } else {
      const settingsProvider = options?.settingsProvider ?? new BrowserSettingsProvider();
      const settings = settingsProvider.getSettings();
      this.configFactory = new BrowserConfigFactory({ settings });
    }
  }

  /**
   * LaunchOptions を生成します
   */
  public createLaunchOptions(overrides?: Partial<LaunchOptions>): LaunchOptions {
    return this.configFactory.createLaunchOptions(overrides);
  }

  /**
   * ブラウザ（Browser）を起動します
   */
  public async launch(overrides?: Partial<LaunchOptions>): Promise<Browser> {
    try {
      const launchOptions = this.createLaunchOptions(overrides);
      return await chromium.launch(launchOptions);
    } catch (error: unknown) {
      this.handleLaunchError(error);
    }
  }

  /**
   * 永続的な BrowserContext（launchPersistentContext）を起動します
   */
  public async launchPersistentContext(
    userDataDir: string,
    options?: Partial<LaunchOptions & BrowserContextOptions>
  ): Promise<BrowserContext> {
    try {
      const launchOptions = this.createLaunchOptions(options);
      const contextOptions = this.configFactory.createContextOptions(options);
      return await chromium.launchPersistentContext(userDataDir, {
        ...launchOptions,
        ...contextOptions,
        ...options,
      });
    } catch (error: unknown) {
      this.handleLaunchError(error);
    }
  }

  /**
   * 起動エラーのログ出力および標準化された例外への変換を行います
   */
  private handleLaunchError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`${LOG_TAGS.SERVICE} Failed to initialize browser:`, message);
    const isMissing =
      message.includes("Executable doesn't exist") ||
      message.includes("Please run") ||
      message.includes("playwright install") ||
      message.includes("Failed to launch chromium");

    if (isMissing) {
      throw new BrowserMissingError(
        "Playwrightブラウザがインストールされていません。\n\nnpx playwright install chromium\n\nを実行してください。",
        { cause: error }
      );
    }

    throw new Error(`Playwrightブラウザの起動に失敗しました: ${message}`, { cause: error });
  }
}

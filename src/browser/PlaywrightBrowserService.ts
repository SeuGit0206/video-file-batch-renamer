import type { Browser, BrowserContext, Page, LaunchOptions, BrowserContextOptions } from 'playwright';
import { BrowserSettingsProvider } from './BrowserSettingsProvider';
import { BrowserConfigFactory } from './BrowserConfigFactory';
import type { OwnedBrowserContext, IdentifiedPage } from './types';
import { LoggingService, CdpDiagnosticsService, type ICdpDiagnosticsService } from '../services';
import type { ILogger } from '../services';
import {
  BrowserContextFactory,
  BrowserPageFactory,
  BrowserLauncher,
  type IBrowserContextFactory,
  type IBrowserPageFactory,
  type IBrowserLauncher,
  type PageInitOptions
} from '../factories';

/**
 * Playwright ブラウザのライフサイクルと操作を管理するサービスインターフェース / クラス
 */
export class PlaywrightBrowserService {
  private settingsProvider: BrowserSettingsProvider;
  private configFactory: BrowserConfigFactory;
  private contextFactory: IBrowserContextFactory;
  private pageFactory: IBrowserPageFactory;
  private launcher: IBrowserLauncher;
  private cdpDiagnosticsService: ICdpDiagnosticsService;
  private logger: ILogger;
  private browser: Browser | null = null;
  private activeContexts: Set<BrowserContext> = new Set();

  constructor(
    settingsProvider?: BrowserSettingsProvider,
    configFactory?: BrowserConfigFactory,
    logger?: ILogger,
    contextFactory?: IBrowserContextFactory,
    pageFactory?: IBrowserPageFactory,
    launcher?: IBrowserLauncher,
    cdpDiagnosticsService?: ICdpDiagnosticsService
  ) {
    this.logger = logger ?? LoggingService.getInstance();
    this.settingsProvider = settingsProvider ?? new BrowserSettingsProvider();
    if (!configFactory) {
      const settings = this.settingsProvider.getSettings();
      this.configFactory = new BrowserConfigFactory({ settings });
    } else {
      this.configFactory = configFactory;
    }
    this.contextFactory = contextFactory ?? new BrowserContextFactory({
      configFactory: this.configFactory,
      settingsProvider: this.settingsProvider,
    });
    this.pageFactory = pageFactory ?? new BrowserPageFactory();
    this.launcher = launcher ?? new BrowserLauncher({
      configFactory: this.configFactory,
      settingsProvider: this.settingsProvider,
      logger: this.logger,
    });
    this.cdpDiagnosticsService = cdpDiagnosticsService ?? new CdpDiagnosticsService(this.logger);
  }

  /**
   * CDP 診断サービスを取得します
   */
  public getCdpDiagnosticsService(): ICdpDiagnosticsService {
    return this.cdpDiagnosticsService;
  }

  /**
   * ブラウザインスタンスを取得します
   */
  public getBrowser(): Browser | null {
    return this.browser;
  }

  /**
   * ブラウザインスタンスを初期化・起動します
   */
  public async initialize(launchOverrides?: Partial<LaunchOptions>): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }
    this.browser = await this.launcher.launch(launchOverrides);
    return this.browser;
  }

  /**
   * ブラウザが接続中かどうかを判定します
   */
  public isConnected(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }

  /**
   * Service所有のアクティブな BrowserContext 一覧を配列として返します（浅いコピー）
   */
  public getContexts(): BrowserContext[] {
    return [...this.activeContexts];
  }

  /**
   * 新しい BrowserContext を生成します
   * Service が所有権 (isOwnedByService = true) を保持し、activeContexts で管理します
   */
  public async createContext(contextOverrides?: Partial<BrowserContextOptions>): Promise<BrowserContext> {
    if (!this.browser || !this.browser.isConnected()) {
      await this.initialize();
    }
    const context = await this.contextFactory.createContext(this.browser!, contextOverrides) as OwnedBrowserContext;
    context.isOwnedByService = true;
    this.activeContexts.add(context);
    return context;
  }

  /**
   * 指定した Context（未指定の場合は Service 所有の新規 Context）から新しい Page を生成します
   * 
   * @param context 外部から渡された Context（指定時は呼び出し元が所有権を保持）
   * @param contextOverrides context 未指定時に生成される Service 所有 Context のオプション
   * @param pageInitOptions Page 生成時の初期化オプション（Timeout, Extra Headers, Scripts等）
   */
  public async createPage(
    context?: BrowserContext,
    contextOverrides?: Partial<BrowserContextOptions> & { hashId?: string },
    pageInitOptions?: PageInitOptions & { hashId?: string }
  ): Promise<Page> {
    const targetContext = context ?? await this.createContext(contextOverrides);
    const page = await this.pageFactory.createPage(targetContext, pageInitOptions);
    const hashId = (contextOverrides as Record<string, unknown> | undefined)?.hashId ?? (pageInitOptions as Record<string, unknown> | undefined)?.hashId;
    if (typeof hashId === 'string') {
      (page as IdentifiedPage).hashId = hashId;
    }
    return page;
  }

  /**
   * Page を閉じます（Page の生命周期管理）
   */
  public async closePage(page: Page): Promise<void> {
    if (page && !page.isClosed()) {
      await page.close();
    }
  }

  /**
   * BrowserContext を閉じて管理対象から削除します（Service 所有 Context の破棄）
   */
  public async closeContext(context: BrowserContext): Promise<void> {
    if (context) {
      this.activeContexts.delete(context);
      await context.close();
    }
  }

  /**
   * 起動中の Service 所有 Context および Browser をすべて破棄します
   */
  public async dispose(): Promise<void> {
    for (const context of Array.from(this.activeContexts)) {
      try {
        await context.close();
      } catch {
        // 解放時の例外は無視
      }
    }
    this.activeContexts.clear();

    if (this.browser) {
      try {
        await this.browser.close();
      } catch {
        // 解放時の例外は無視
      }
      this.browser = null;
    }
  }
}


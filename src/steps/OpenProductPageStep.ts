import path from 'path';
import fs from 'fs';
import type { BrowserContext, Cookie } from 'playwright';
import type { IScrapingStep } from './IScrapingStep';
import type { ScrapingContext } from './ScrapingContext';
import { PlaywrightBrowserService } from '../browser/PlaywrightBrowserService';
import type { BrowserSettingsProvider } from '../browser/BrowserSettingsProvider';
import type { BrowserConfigFactory } from '../browser/BrowserConfigFactory';
import type { IdentifiedPage } from '../browser/types';
import type { ILogger, ICdpDiagnosticsService, IDiagnosticsStorageService } from '../services';
import { CookieService } from '../services';
import { ScraperError } from '../errors';
import {
  COOKIES_FILE_PATH,
  LOG_TAGS,
  HTTP_STATUS,
  PLAYWRIGHT_LAUNCH_ARGS
} from '../constants';
import { getErrorMessage } from '../types';

const PLAYWRIGHT_HEADLESS = process.env.PLAYWRIGHT_HEADLESS !== 'false';
const STORAGE_STATE_PATH = CookieService.getStorageStatePath();

export class OpenProductPageStep implements IScrapingStep {
  constructor(
    private settingsProvider: BrowserSettingsProvider,
    private configFactory: BrowserConfigFactory,
    private logger: ILogger,
    private cdpDiagnosticsService: ICdpDiagnosticsService,
    private diagnosticsStorageService: IDiagnosticsStorageService,
    private browserServiceFactory?: () => PlaywrightBrowserService
  ) {}

  public async execute(ctx: ScrapingContext): Promise<void> {
    this.logger.info(`${LOG_TAGS.SCRAPING} Launching browser to access: ${ctx.url}`);

    const launchArgs = [...PLAYWRIGHT_LAUNCH_ARGS];
    const browserSettings = this.settingsProvider.load();
    browserSettings.headless = PLAYWRIGHT_HEADLESS;

    const browserService = this.browserServiceFactory
      ? this.browserServiceFactory()
      : new PlaywrightBrowserService(this.settingsProvider, this.configFactory);

    const contextOptions = this.configFactory.createContextOptions({
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      acceptDownloads: false,
      javaScriptEnabled: true,
      extraHTTPHeaders: {
        'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-ch-ua-full-version-list': '"Chromium";v="124.0.0.0", "Google Chrome";v="124.0.0.0", "Not-A.Brand";v="99.0.0.0"'
      }
    });

    const hasStorage = fs.existsSync(STORAGE_STATE_PATH);
    this.diagnosticsStorageService.ensureDiagnosticsDir();
    this.diagnosticsStorageService.savePlaywrightDiff(contextOptions, PLAYWRIGHT_HEADLESS);

    ctx.globalCookies = CookieService.loadCookies();

    this.logger.info(`\n--- [BrowserContext設定確認ログ] ---`);
    this.logger.info(`  Headless: ${PLAYWRIGHT_HEADLESS}`);
    this.logger.info(`  UserDataDir利用有無: 無`);
    this.logger.info(`  StorageState利用有無: ${hasStorage ? '有' : '無'}`);
    this.logger.info(`  Cookie件数: ${ctx.globalCookies ? ctx.globalCookies.length : 0}`);
    this.logger.info(`------------------------------------\n`);

    this.logger.info("===== HEADLESS START =====");
    const h1BrowserHash = this.getObjHash();
    this.logger.info(`Headless=${PLAYWRIGHT_HEADLESS} Browser生成 [Browser Launch] Hash=${h1BrowserHash}`);

    ctx.browser = await browserService.initialize({ headless: PLAYWRIGHT_HEADLESS, args: launchArgs });

    const h1ContextHash = this.getObjHash();
    const h1ContextOptions = {
      ...contextOptions,
      ...(hasStorage ? { storageState: STORAGE_STATE_PATH } : {}),
      recordHar: {
        path: path.join(process.cwd(), 'logs', 'detail-page-headless.har'),
        mode: 'full' as const
      }
    };

    ctx.context = await browserService.createContext(h1ContextOptions);
    this.logger.info(`Context生成 Hash=${h1ContextHash}`);
    await this.injectEvasion(ctx.context);

    await this.loadCookies(ctx, hasStorage, PLAYWRIGHT_HEADLESS);

    const h1ActualCookies = await ctx.context.cookies();
    this.logger.info(`Contextに登録されたCookie件数: ${h1ActualCookies.length}`);
    this.logger.info("Cookie一覧:");
    h1ActualCookies.forEach(c => {
      this.logger.info(`  Name: ${c.name}, Domain: ${c.domain}, Path: ${c.path}, Expires: ${c.expires}, Secure: ${c.secure}, HttpOnly: ${c.httpOnly}`);
    });

    ctx.page = await this.createAndHashPage(ctx.context, browserService);

    ctx.addTimelineLog("Challenge Start");
    const headlessCDP = await this.cdpDiagnosticsService.setupCDPTracking(ctx.context, ctx.page, "detail-headless");

    await this.logNavigatorInfo(ctx.page, PLAYWRIGHT_HEADLESS);

    try {
      ctx.addTimelineLog("JS Load Started");
      ctx.response = await ctx.page.goto(ctx.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      try {
        await ctx.page.waitForLoadState('networkidle', { timeout: 10000 });
      } catch {
        this.logger.info("networkidle wait timed out, continuing...");
      }
      try {
        await ctx.page.waitForSelector('body', { timeout: 15000 });
      } catch {
        this.logger.info("waitForSelector body timed out, continuing...");
      }
      ctx.status = ctx.response ? ctx.response.status() : HTTP_STATUS.OK;
      ctx.addTimelineLog("Navigation Completed", { status: ctx.status });
    } catch (gotoErr: unknown) {
      ctx.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
      const errMsg = getErrorMessage(gotoErr);
      ctx.exceptionMessage = errMsg;
      ctx.exceptionStack = gotoErr instanceof Error ? gotoErr.stack : undefined;
      this.logger.error(`${LOG_TAGS.SCRAPING} Initial page.goto failed: ${errMsg}`);
      ctx.addTimelineLog("Navigation Failed", { error: errMsg });
    }

    try { ctx.finalUrl = ctx.page.url(); } catch { ctx.finalUrl = ctx.url; }
    try { ctx.pageTitle = await ctx.page.title(); } catch { ctx.pageTitle = ''; }
    try { ctx.html = await ctx.page.content(); } catch { ctx.html = ''; }

    if (headlessCDP) headlessCDP.saveCDP();
    await this.diagnosticsStorageService.runAndSaveFingerprint(ctx.page);
    await this.diagnosticsStorageService.runAndSaveHTML(ctx.page, "headless", ctx.cleanId);

    ctx.page403Data = await this.capturePageState(ctx.page, ctx.context, ctx.status);

    this.logger.info(`${LOG_TAGS.LIFECYCLE} page.content() obtained. Page Instance: ${ctx.page ? ctx.page.hashId : 'null'}`);
    this.logger.info(`${LOG_TAGS.LIFECYCLE} HTML retrieved size: ${ctx.html ? ctx.html.length : 0} characters`);
    this.logger.info(`${LOG_TAGS.LIFECYCLE} Title retrieved: "${ctx.pageTitle}"`);

    const isPageEmpty = !ctx.html || ctx.html.trim() === '' || ctx.html === '(Failed to retrieve page content HTML)' ||
                        !ctx.pageTitle || ctx.pageTitle.trim() === '';

    const isVipUrl = ctx.finalUrl.includes('/vip');
    if (isPageEmpty && ctx.status !== HTTP_STATUS.NOT_FOUND && !isVipUrl) {
      this.logger.info("ページ取得失敗: HTMLまたはタイトルが取得できませんでした。");
      throw new ScraperError("ページ取得失敗（HTMLまたはタイトルが空です）", {
        status: HTTP_STATUS.BAD_GATEWAY,
        debug: {
          finalUrl: ctx.finalUrl,
          pageTitle: ctx.pageTitle || 'Failed to retrieve page title',
          htmlLength: ctx.html ? ctx.html.length : 0,
          htmlPreview: ctx.html ? ctx.html.substring(0, 1000) : '',
          bodyPreview: ctx.bodyPreview || '',
          status: ctx.status
        }
      });
    }
  }

  private getObjHash(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  private async injectEvasion(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
  }

  private async loadCookies(ctx: ScrapingContext, hasStorage: boolean, isHeadless: boolean): Promise<void> {
    if (hasStorage) {
      this.logger.info(`StorageState適用 (${isHeadless ? 'Headless' : 'Headful'})`);
      return;
    }
    let localCookies: Cookie[] = [];
    const cookiesPath = path.join(process.cwd(), COOKIES_FILE_PATH);
    try {
      if (fs.existsSync(cookiesPath)) {
        localCookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
      }
    } catch (e: unknown) {
      this.logger.info(`Failed to load persistent cookies: ${e instanceof Error ? e.message : String(e)}`);
    }

    const targetCookies = (localCookies && localCookies.length > 0) ? localCookies : (ctx.globalCookies || []);
    if (targetCookies.length > 0 && ctx.context) {
      this.logger.info(`Cookie適用 (${isHeadless ? 'Headless' : 'Headful'}) [Count: ${targetCookies.length}]`);
      await ctx.context.addCookies(targetCookies as Parameters<BrowserContext['addCookies']>[0]);
    }
  }

  private async createAndHashPage(context: BrowserContext, browserService: PlaywrightBrowserService): Promise<IdentifiedPage> {
    const page = await browserService.createPage(context) as IdentifiedPage;
    page.hashId = Math.random().toString(36).substring(2, 10);
    this.logger.info(`[Page Created] Hash=${page.hashId}`);
    return page;
  }

  private async logNavigatorInfo(page: IdentifiedPage, isHeadless: boolean): Promise<void> {
    try {
      const navInfo = await page.evaluate(() => {
        return {
          userAgent: navigator.userAgent,
          webdriver: navigator.webdriver,
          languages: navigator.languages,
          platform: navigator.platform,
          hardwareConcurrency: navigator.hardwareConcurrency,
          deviceMemory: (navigator as unknown as { deviceMemory?: number }).deviceMemory
        };
      });
      this.logger.info(`\n--- [Playwright / Navigator Diagnostics (${isHeadless ? 'Headless' : 'Headful'})] ---`);
      this.logger.info(`  userAgent: ${navInfo.userAgent}`);
      this.logger.info(`  webdriver: ${navInfo.webdriver}`);
      this.logger.info(`  languages: ${JSON.stringify(navInfo.languages)}`);
      this.logger.info(`  platform: ${navInfo.platform}`);
      this.logger.info(`  hardwareConcurrency: ${navInfo.hardwareConcurrency}`);
      this.logger.info(`  deviceMemory: ${navInfo.deviceMemory}`);
      this.logger.info(`-----------------------------------------------------------------\n`);
    } catch (e: unknown) {
      this.logger.warn(`Failed to retrieve navigator info: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async capturePageState(page: IdentifiedPage | null, context: BrowserContext | null, status: number): Promise<Record<string, unknown> | null> {
    if (!page || !context) return null;
    try {
      const title = await page.title().catch(() => '');
      const html = await page.content().catch(() => '');
      const cookies = await context.cookies().catch(() => []);
      return {
        status,
        title,
        htmlLen: html.length,
        cookiesCount: cookies.length
      };
    } catch {
      return null;
    }
  }
}

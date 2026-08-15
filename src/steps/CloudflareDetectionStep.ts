import path from 'path';
import fs from 'fs';
import type { BrowserContext, Cookie, Request as PWRequest, Response as PWResponse, Frame } from 'playwright';
import type { IScrapingStep } from './IScrapingStep';
import type { ScrapingContext } from './ScrapingContext';
import { PlaywrightBrowserService } from '../browser/PlaywrightBrowserService';
import type { BrowserSettingsProvider } from '../browser/BrowserSettingsProvider';
import type { BrowserConfigFactory } from '../browser/BrowserConfigFactory';
import type { IdentifiedPage } from '../browser/types';
import type { ILogger, ICdpDiagnosticsService, IDiagnosticsStorageService } from '../services';
import { CloudflareService, CookieService } from '../services';
import type { IRetryPolicy } from '../policies';
import type { IStealthStrategy } from '../strategies';
import { isBrowserMissingError } from '../types';
import {
  COOKIES_FILE_PATH,
  PLAYWRIGHT_LAUNCH_ARGS
} from '../constants';

const STORAGE_STATE_PATH = CookieService.getStorageStatePath();
const USE_PERSISTENT = true;

export class CloudflareDetectionStep implements IScrapingStep {
  constructor(
    private settingsProvider: BrowserSettingsProvider,
    private configFactory: BrowserConfigFactory,
    private logger: ILogger,
    private retryPolicy: IRetryPolicy,
    private stealthStrategy: IStealthStrategy,
    private cdpDiagnosticsService: ICdpDiagnosticsService,
    private diagnosticsStorageService: IDiagnosticsStorageService,
    private browserServiceFactory?: () => PlaywrightBrowserService
  ) {}

  public async execute(ctx: ScrapingContext): Promise<void> {
    const initialCfReasons = CloudflareService.checkCloudflare(ctx.pageTitle, ctx.html, ctx.status);

    try {
      fs.mkdirSync(path.join(process.cwd(), 'logs', 'html'), { recursive: true });
      fs.writeFileSync(path.join(process.cwd(), 'logs', 'html', `${ctx.cleanId}-headless.html`), ctx.html, 'utf-8');
      this.logger.info(`HTML saved:\nlogs/html/${ctx.cleanId}-headless.html`);
    } catch (fileEx: unknown) {
      this.logger.error(`Failed to save headless HTML: ${fileEx instanceof Error ? fileEx.message : String(fileEx)}`);
    }

    if (initialCfReasons.length > 0 || ctx.finalUrl.includes('__cf_chl_rt_tk')) {
      await this.stealthStrategy.handleCloudflareDetected(ctx.pageTitle, ctx.status);
      this.logger.info("===== HEADLESS END =====");
      this.logger.info("\n===== CLOUDFLARE RETRY START =====");
      this.logger.info("===== HEADFUL START =====");
      this.logger.info("BrowserPageValidator: Cloudflare detected. Switching to Headless=False / Persistent Context.");

      this.logger.info("Browser.Close");
      const browserService = this.browserServiceFactory
        ? this.browserServiceFactory()
        : new PlaywrightBrowserService(this.settingsProvider, this.configFactory);

      if (ctx.page) { try { await browserService.closePage(ctx.page); } catch {} ctx.page = null; }
      if (ctx.context) { try { await browserService.closeContext(ctx.context); } catch {} ctx.context = null; }
      if (ctx.browser) { try { await browserService.dispose(); } catch {} ctx.browser = null; }

      this.logger.info("Browser.DisposeAsync()");
      this.logger.info("Playwright.Dispose()");

      const maxRetries = this.retryPolicy.getMaxRetries();
      ctx.isBypassed = false;

      const launchArgs = [...PLAYWRIGHT_LAUNCH_ARGS];
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

      for (let attempt = 1; this.retryPolicy.shouldRetry(attempt); attempt++) {
        const attemptHasStorage = fs.existsSync(STORAGE_STATE_PATH);

        this.logger.info(`\n--- Headless=False Attempt ${attempt} / ${maxRetries} ---`);
        this.logger.info("Headless=False Browser/Context生成");

        this.logger.info(`\n--- [BrowserContext設定確認ログ] ---`);
        this.logger.info(`  Headless: false`);
        this.logger.info(`  UserDataDir利用有無: ${USE_PERSISTENT ? '有 (userdata/)' : '無'}`);
        this.logger.info(`  StorageState利用有無: ${attemptHasStorage ? '有' : '無'}`);
        this.logger.info(`  Cookie件数: ${ctx.globalCookies ? ctx.globalCookies.length : 0}`);
        this.logger.info(`------------------------------------\n`);

        const h2BrowserHash = Math.random().toString(36).substring(2, 10);
        const activeContextOpts = {
          ...contextOptions,
          ...(attemptHasStorage ? { storageState: STORAGE_STATE_PATH } : {}),
          recordHar: {
            path: path.join(process.cwd(), 'logs', 'detail-page-headful.har'),
            mode: 'full' as const
          }
        };

        try {
          this.logger.info("有頭ブラウザを起動します。");
          ctx.browser = await browserService.initialize({ headless: false, args: launchArgs });
          this.logger.info("Browser recreated");
          ctx.context = await browserService.createContext(activeContextOpts);
          this.logger.info("Context recreated");
        } catch (launchErr: unknown) {
          if (isBrowserMissingError(launchErr) && launchErr.isBrowserMissing) {
            throw launchErr;
          }
          this.logger.warn(`[Playwright Warning] Headless: false launch failed: ${launchErr instanceof Error ? launchErr.message : String(launchErr)}. Falling back to Headless: true.`);
          ctx.browser = await browserService.initialize({ headless: true, args: launchArgs });
          this.logger.info("Browser recreated");
          ctx.context = await browserService.createContext(activeContextOpts);
          this.logger.info("Context recreated");
        }
        this.logger.info(`[Browser/Context Launched] Hash=${h2BrowserHash}`);
        await this.injectEvasion(ctx.context);

        this.logger.info("Loading Cookies...");
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
          this.logger.info(`Cookie適用 (Headless=False) [Count: ${targetCookies.length}]`);
          await ctx.context.addCookies(targetCookies as Parameters<BrowserContext['addCookies']>[0]);
          this.logger.info("Cookies reapplied");
        }

        if (ctx.context) {
          const h2ActualCookies = await ctx.context.cookies();
          this.logger.info(`Contextに登録されたCookie件数: ${h2ActualCookies.length}`);
          this.logger.info("Cookie一覧:");
          h2ActualCookies.forEach(c => {
            this.logger.info(`  Name: ${c.name}, Domain: ${c.domain}, Path: ${c.path}, Expires: ${c.expires}, Secure: ${c.secure}, HttpOnly: ${c.httpOnly}`);
          });
        }

        ctx.page = await browserService.createPage(ctx.context) as IdentifiedPage;
        ctx.page.hashId = Math.random().toString(36).substring(2, 10);
        this.logger.info("Page recreated");

        const headfulCDP = ctx.context && ctx.page
          ? await this.cdpDiagnosticsService.setupCDPTracking(ctx.context, ctx.page, "detail-headful")
          : null;

        const headfulNetwork: unknown[] = [];
        if (ctx.page) {
          ctx.page.on('request', (req: PWRequest) => {
            const redirectChain: unknown[] = [];
            let currentReq: PWRequest | null = req;
            while (currentReq && currentReq.redirectedFrom()) {
              const prev = currentReq.redirectedFrom()!;
              redirectChain.push({
                url: prev.url(),
                method: prev.method(),
                headers: prev.headers()
              });
              currentReq = prev;
            }
            headfulNetwork.push({
              type: 'request',
              url: req.url(),
              method: req.method(),
              headers: req.headers(),
              isNavigationRequest: req.isNavigationRequest(),
              resourceType: req.resourceType(),
              redirectChain,
              timestamp: Date.now()
            });

            if (req.resourceType() === 'script') {
              ctx.addTimelineLog('JSLoaded', { url: req.url() });
            }
            if (req.method() === 'POST') {
              ctx.addTimelineLog('POSTRequest', { url: req.url(), headers: req.headers() });
            }
          });

          ctx.page.on('response', async (res: PWResponse) => {
            let securityDetails = null;
            try { securityDetails = await res.securityDetails(); } catch {}
            let timing = null;
            try { timing = res.request().timing(); } catch {}
            let headers = {};
            try { headers = res.headers(); } catch {}

            headfulNetwork.push({
              type: 'response',
              url: res.url(),
              status: res.status(),
              statusText: res.statusText(),
              headers: headers,
              timing: timing,
              securityDetails,
              httpVersion: (res as unknown as { _initializer?: { httpVersion?: string } })._initializer?.httpVersion || 'HTTP/1.1',
              timestamp: Date.now()
            });
          });

          ctx.page.on('framenavigated', (frame: Frame) => {
            ctx.addTimelineLog('Navigation', { url: frame.url() });
          });
        }

        this.logger.info(`Goto(): ${ctx.url}`);
        try {
          if (ctx.page) {
            ctx.response = await ctx.page.goto(ctx.url, {
              waitUntil: 'domcontentloaded',
              timeout: 45000
            });
            try {
              await ctx.page.waitForLoadState('networkidle', { timeout: 10000 });
            } catch {
              this.logger.info("networkidle wait timed out in headful retry...");
            }
            try {
              await ctx.page.waitForSelector('body', { timeout: 15000 });
            } catch {
              this.logger.info("waitForSelector body timed out in headful retry...");
            }
            ctx.status = ctx.response ? ctx.response.status() : 200;
          }
        } catch (gotoErr: unknown) {
          ctx.status = 500;
          const errMsg = gotoErr instanceof Error ? gotoErr.message : String(gotoErr);
          this.logger.error(`[Playwright Scraping] Headful launch page.goto failed: ${errMsg}`);
        }

        if (ctx.page) {
          this.logger.info(`Page.Url: ${ctx.page.url()}`);
          let tempTitle = '';
          try { tempTitle = await ctx.page.title(); } catch {}
          this.logger.info(`Page.Title: ${tempTitle}`);
        }
        this.logger.info(`HTTP Status: ${ctx.status}`);

        this.logger.info("Cloudflare待機開始");
        const startTime = Date.now();
        this.logger.info("Challenge開始");

        let lastCookieStr = '';
        let lastHtmlLen = 0;

        while (true) {
          const elapsed = Date.now() - startTime;

          let currentTitle = '';
          if (ctx.page) { try { currentTitle = await ctx.page.title(); } catch {} }

          let currentUrl = '';
          if (ctx.page) { try { currentUrl = ctx.page.url(); } catch {} }

          let currentHtml = '';
          if (ctx.page) { try { currentHtml = await ctx.page.content(); } catch {} }

          let currentCookies: Array<{ name: string; domain: string; expires?: number }> = [];
          if (ctx.context) { try { currentCookies = await ctx.context.cookies(); } catch {} }
          const cookiesCount = currentCookies.length;

          const hasTurnstile = currentHtml.toLowerCase().includes('cf-turnstile') || currentHtml.toLowerCase().includes('turnstile');
          const hasChallengeForm = currentHtml.includes('challenge-form') || currentHtml.includes('cf-challenge') || currentHtml.includes('cf_challenge') || currentHtml.includes('cloudflare-challenge');
          const hasCfClearance = currentCookies.some(c => c.name === 'cf_clearance');
          const hasCfTk = currentUrl.includes('__cf_chl_rt_tk');
          const hasIframe = currentHtml.toLowerCase().includes('<iframe') && currentHtml.toLowerCase().includes('challenges.cloudflare.com');

          const isBlocked = CloudflareService.checkCloudflare(currentTitle, currentHtml, ctx.status).length > 0 || hasCfTk || currentTitle === "Just a moment...";

          ctx.addTimelineLog('ChallengeLoop', {
            elapsedMs: elapsed,
            title: currentTitle,
            url: currentUrl,
            cookiesCount,
            hasTurnstile,
            hasChallengeForm,
            hasCfClearance,
            hasIframe,
            isBlocked
          });

          const currentCookiesStr = JSON.stringify(currentCookies);
          if (currentCookiesStr !== lastCookieStr) {
            ctx.addTimelineLog('CookieChanged', {
              cookiesCount: currentCookies.length,
              cookies: currentCookies.map(c => c.name)
            });
            lastCookieStr = currentCookiesStr;
          }

          if (currentHtml.length !== lastHtmlLen) {
            ctx.addTimelineLog('DOMChanged', {
              prevLen: lastHtmlLen,
              currentLen: currentHtml.length
            });
            lastHtmlLen = currentHtml.length;
          }

          this.logger.info(`[待機中 ${(elapsed / 1000).toFixed(1)}秒] Title: ${currentTitle} | URL: {${currentUrl}} | Status: ${ctx.status} | Cookie数: ${cookiesCount} | cf_clearance: ${hasCfClearance} | Turnstile: ${hasTurnstile} | ChallengeForm: ${hasChallengeForm} | Iframe: ${hasIframe} | Blocked: ${isBlocked}`);

          if (elapsed >= this.retryPolicy.getCloudflareMinWaitTime()) {
            if (!isBlocked && !hasTurnstile && !hasChallengeForm && !hasIframe) {
              this.logger.info("Cloudflare解除検知");
              this.logger.info("Cloudflare solved");
              this.logger.info("Challenge解除");
              ctx.isBypassed = true;
              break;
            }
          }

          if (this.retryPolicy.isCloudflareTimeout(elapsed)) {
            this.logger.info("Cloudflare retry failed. (Timeout)");
            this.logger.info("Challenge失敗");
            break;
          }

          await this.stealthStrategy.wait(this.retryPolicy.getCloudflarePollInterval());
        }

        if (ctx.isBypassed && ctx.page) {
          this.logger.info(`[WaitForURL] Waiting for URL to stabilize back to: ${ctx.url}`);
          try {
            await ctx.page.waitForURL(ctx.url, {
              waitUntil: 'domcontentloaded',
              timeout: 30000
            });
            ctx.status = 200;
          } catch (waitErr: unknown) {
            const waitMsg = waitErr instanceof Error ? waitErr.message : String(waitErr);
            this.logger.warn(`[Playwright Warning] waitForURL to original path failed: ${waitMsg}. Trying reload.`);
            try {
              ctx.response = await ctx.page.reload({
                waitUntil: 'domcontentloaded',
                timeout: 30000
              });
              ctx.status = ctx.response ? ctx.response.status() : 200;
            } catch (reloadErr: unknown) {
              const reloadMsg = reloadErr instanceof Error ? reloadErr.message : String(reloadErr);
              this.logger.error(`[Playwright Scraping] page.reload failed: ${reloadMsg}`);
            }
          }

          try { ctx.finalUrl = ctx.page.url(); } catch { ctx.finalUrl = ctx.url; }
          try { ctx.pageTitle = await ctx.page.title(); } catch { ctx.pageTitle = '(Failed to retrieve page title)'; }
          try { ctx.html = await ctx.page.content(); } catch { ctx.html = '(Failed to retrieve page content HTML)'; }

          if (headfulCDP) headfulCDP.saveCDP();
          ctx.page200Data = await this.capturePageState(ctx.page, ctx.context, ctx.status);
          this.diagnosticsStorageService.savePageComparison(ctx.page403Data, ctx.page200Data);
          await this.diagnosticsStorageService.runAndSaveHTML(ctx.page, "headful", ctx.cleanId);

          try {
            if (ctx.context) {
              const finalCookies = await ctx.context.cookies();
              const headfulReport = {
                navigationUrl: ctx.url,
                timestamp: new Date().toISOString(),
                events: headfulNetwork,
                cookies: finalCookies
              };
              fs.writeFileSync(path.join(process.cwd(), 'logs', 'network-diagnostics-detail.json'), JSON.stringify(headfulReport, null, 2), 'utf-8');
            }
          } catch (e: unknown) {
            const eMsg = e instanceof Error ? e.message : String(e);
            this.logger.error("Failed to save headful network diagnostics:", eMsg);
          }

          const finalCfReasons = CloudflareService.checkCloudflare(ctx.pageTitle, ctx.html, ctx.status);
          if (finalCfReasons.length === 0 && !ctx.finalUrl.includes('__cf_chl_rt_tk')) {
            try {
              fs.writeFileSync(path.join(process.cwd(), 'logs', 'html', `${ctx.cleanId}-headful.html`), ctx.html, 'utf-8');
              this.logger.info(`HTML saved:\nlogs/html/${ctx.cleanId}-headful.html`);
            } catch (fileEx: unknown) {
              const fileMsg = fileEx instanceof Error ? fileEx.message : String(fileEx);
              this.logger.error(`Failed to save headful HTML: ${fileMsg}`);
            }

            try {
              if (ctx.context) {
                const solvedCookies = await ctx.context.cookies();
                this.logger.info("Cloudflare突破後 Cookie一覧:");
                solvedCookies.forEach(c => {
                  this.logger.info(`  Name: ${c.name}, Domain: ${c.domain}, Expires: ${c.expires}`);
                });
              }
            } catch {}

            this.logger.info("Saving StorageState...");
            try {
              if (ctx.context) {
                fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });
                await ctx.context.storageState({ path: STORAGE_STATE_PATH });
                this.logger.info(`StorageState保存成功: ${STORAGE_STATE_PATH}`);
              }
            } catch (stateErr: unknown) {
              const stateMsg = stateErr instanceof Error ? stateErr.message : String(stateErr);
              this.logger.error(`Failed to save StorageState: ${stateMsg}`);
            }

            this.logger.info("Saving Cookies...");
            try {
              if (ctx.context) {
                const savedCookies = await ctx.context.cookies();
                ctx.globalCookies = savedCookies;
                CookieService.saveCookies(savedCookies);
                this.logger.info(`Cookie保存 (Cookie保存件数: ${savedCookies.length})`);
              }
            } catch (cookieErr: unknown) {
              const cookieMsg = cookieErr instanceof Error ? cookieErr.message : String(cookieErr);
              this.logger.error(`[Playwright Scraping] Failed to save cookies: ${cookieMsg}`);
            }
            break;
          } else {
            ctx.isBypassed = false;
            this.logger.info("Challenge seemed cleared, but final page check failed. Re-trying with new context...");
          }
        }

        this.logger.info("Browser.Close (リトライ失敗によるクローズ)");
        if (ctx.page) { try { await browserService.closePage(ctx.page); } catch {} ctx.page = null; }
        if (ctx.context) { try { await browserService.closeContext(ctx.context); } catch {} ctx.context = null; }
        if (ctx.browser) { try { await browserService.dispose(); } catch {} ctx.browser = null; }
      }

      ctx.addTimelineLog("Challenge End", { isBypassed: ctx.isBypassed });
      try {
        fs.writeFileSync(path.join(process.cwd(), 'logs', 'cloudflare-timeline.json'), JSON.stringify(ctx.cfTimeline, null, 2), 'utf-8');
      } catch (e: unknown) {
        const eMsg = e instanceof Error ? e.message : String(e);
        this.logger.error("Failed to save cloudflare timeline:", eMsg);
      }

      if (!ctx.isBypassed) {
        this.logger.info("Cloudflare retry failed.");
        ctx.exceptionMessage = `CloudflareException: Cloudflare bypass failed after waiting 120 seconds. Status = ${ctx.status}, Title = ${ctx.pageTitle}`;
      }

      this.logger.info(`Retry HTML Length: ${ctx.html.length}`);
      this.logger.info("===== HEADFUL END =====");
      this.logger.info("===== CLOUDFLARE RETRY END =====");
    }
  }

  private async injectEvasion(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
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

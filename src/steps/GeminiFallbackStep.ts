import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import type { Browser, BrowserContext, Cookie, Request as PWRequest, Response as PWResponse, ConsoleMessage } from 'playwright';
import type { IScrapingStep } from './IScrapingStep';
import type { ScrapingContext } from './ScrapingContext';
import { PlaywrightBrowserService } from '../browser/PlaywrightBrowserService';
import type { BrowserSettingsProvider } from '../browser/BrowserSettingsProvider';
import type { BrowserConfigFactory } from '../browser/BrowserConfigFactory';
import type { IdentifiedPage } from '../browser/types';
import type { ILogger, ICdpDiagnosticsService, IDiagnosticsStorageService } from '../services';
import { HtmlParserService } from '../parsers';
import { GeminiSearchService } from '../services';
import type { IMetadataBuilder } from '../builders';
import type { ScrapedMetadata, DocumentInfo } from '../types';
import { CookieService } from '../services';
import {
  USER_AGENT_AISTUDIO,
  PLAYWRIGHT_LAUNCH_ARGS
} from '../constants';

const STORAGE_STATE_PATH = CookieService.getStorageStatePath();

export class GeminiFallbackStep implements IScrapingStep {
  private aiClient: GoogleGenAI | null = null;

  constructor(
    private settingsProvider: BrowserSettingsProvider,
    private configFactory: BrowserConfigFactory,
    private logger: ILogger,
    private metadataBuilder: IMetadataBuilder,
    private cdpDiagnosticsService: ICdpDiagnosticsService,
    private diagnosticsStorageService: IDiagnosticsStorageService,
    private browserServiceFactory?: () => PlaywrightBrowserService
  ) {}

  public async execute(ctx: ScrapingContext): Promise<void> {
    const detailValidation = HtmlParserService.validateDetailPage(ctx.docInfo, ctx.html, ctx.status, ctx.finalUrl, Boolean(ctx.page));
    const isInvalidDetailPage = detailValidation.isInvalid;

    const directUrlAccess = ctx.url;
    const detailPageValidation = !isInvalidDetailPage ? 'Valid' : 'Invalid';
    const needSearchFallback = isInvalidDetailPage ? 'Yes' : 'No';
    const searchFallbackReason = detailValidation.reason;

    ctx.logSearchFlow(msg => this.logger.info(msg), '\n=== Search Flow ===');
    ctx.logSearchFlow(msg => this.logger.info(msg), `Direct URL Access: ${directUrlAccess}`);
    ctx.logSearchFlow(msg => this.logger.info(msg), `DetailPageValidation: ${detailPageValidation}`);
    ctx.logSearchFlow(msg => this.logger.info(msg), `Need SearchFallback ? ${needSearchFallback} (Reason: ${searchFallbackReason})`);

    if (ctx.finalUrl.includes('/vip')) {
      ctx.logSearchFlow(msg => this.logger.info(msg), "VIPページへリダイレクトされたため検索フォールバックを開始します");
    }

    if (isInvalidDetailPage) {
      const searchFallbackResult = await this.handleSearchFallback(ctx);

      if (searchFallbackResult.status === 'NotFound' && searchFallbackResult.notFoundResponse) {
        ctx.earlyReturnResult = searchFallbackResult.notFoundResponse;
        return;
      }

      ctx.page = searchFallbackResult.page;
      ctx.context = searchFallbackResult.context;
      ctx.browser = searchFallbackResult.browser;
      ctx.docInfo = searchFallbackResult.docInfo;
      ctx.status = searchFallbackResult.statusNum;
      ctx.finalUrl = searchFallbackResult.finalUrl;
      ctx.pageTitle = searchFallbackResult.pageTitle;
      ctx.html = searchFallbackResult.html;
    } else {
      this.logger.info('\nSearchFallback skipped');
      this.logger.info(`Reason: Detail page is valid (status: ${ctx.status}, url: ${ctx.finalUrl})`);
    }
  }

  /**
   * Gemini Search を利用したフォールバック検索 (要求時直接呼出可能)
   */
  public async fallbackToGemini(productId: string): Promise<ScrapedMetadata> {
    const ai = this.getAiClient();
    if (!ai) {
      throw new Error("Gemini API client is not initialized (missing or invalid API key).");
    }
    return GeminiSearchService.fetchMetadataWithGeminiSearch(productId, ai);
  }

  private getAiClient(): GoogleGenAI | null {
    if (!this.aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
        try {
          this.aiClient = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: {
              headers: {
                'User-Agent': USER_AGENT_AISTUDIO,
              }
            }
          });
          this.logger.info("Gemini API client initialized successfully.");
        } catch (e) {
          this.logger.error("Failed to initialize Gemini API client:", e);
        }
      }
    }
    return this.aiClient;
  }

  private async handleSearchFallback(ctx: ScrapingContext): Promise<{
    status: 'NotFound' | 'Success';
    notFoundResponse?: ScrapedMetadata;
    page: IdentifiedPage | null;
    context: BrowserContext | null;
    browser: Browser | null;
    docInfo: DocumentInfo;
    statusNum: number;
    finalUrl: string;
    pageTitle: string;
    html: string;
  }> {
    const logSearchFlow = (msg: string) => ctx.logSearchFlow(m => this.logger.info(m), msg);
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

    let { page, context, browser, docInfo, status, finalUrl, pageTitle, html } = ctx;

    logSearchFlow('SearchFallback Start');
    const searchUrl = `https://missav.ai/ja/search/${encodeURIComponent(ctx.cleanId.toLowerCase())}`;
    logSearchFlow(`Search URL: ${searchUrl}`);

    let fallbackSuccess = false;
    let matchedUrlText = 'なし';
    let searchResultCount = 0;

    const browserService = this.browserServiceFactory
      ? this.browserServiceFactory()
      : new PlaywrightBrowserService(this.settingsProvider, this.configFactory);

    if (page || context || browser) {
      logSearchFlow("[Search Fallback] Closing existing browser/context to start a clean diagnostic run for search...");
      try { await browserService.dispose(); } catch {}
      page = null;
      context = null;
      browser = null;
    }

    logSearchFlow("[Search Fallback] Recreating browser, context, and page for search fallback...");
    try {
      browser = await browserService.initialize({ headless: true, args: launchArgs });
      context = await browserService.createContext({
        ...contextOptions,
        ...(fs.existsSync(STORAGE_STATE_PATH) ? { storageState: STORAGE_STATE_PATH } : {}),
        recordHar: {
          path: path.join(process.cwd(), 'logs', 'search-page.har'),
          mode: 'full' as const
        }
      });
      await this.injectEvasion(context);
      page = await browserService.createPage(context) as IdentifiedPage;
      page.hashId = Math.random().toString(36).substring(2, 10);
    } catch (recreateErr: unknown) {
      logSearchFlow(`[Search Fallback Error] Failed to recreate browser/page: ${recreateErr instanceof Error ? recreateErr.message : String(recreateErr)}`);
    }

    if (!page) {
      logSearchFlow("[Search Fallback Error] Cannot execute search fallback because page instance is still null.");
    } else {
      try {
        const apiRequests: string[] = [];
        const apiResponses: string[] = [];
        const consoleMessages: string[] = [];
        const pageErrors: string[] = [];

        const handleRequest = (req: PWRequest) => {
          apiRequests.push(`[${req.method()}] ${req.url()}`);
        };
        const handleResponse = (res: PWResponse) => {
          apiResponses.push(`[${res.status()}] ${res.url()}`);
        };
        const handleConsole = (msg: ConsoleMessage) => {
          consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
        };
        const handlePageError = (err: Error) => {
          pageErrors.push(`${err.name}: ${err.message}\n${err.stack}`);
        };

        page.on('request', handleRequest);
        page.on('response', handleResponse);
        page.on('console', handleConsole);
        page.on('pageerror', handlePageError);

        const searchCDP = context && page ? await this.cdpDiagnosticsService.setupCDPTracking(context, page, "search-page") : null;

        try {
          if (context && page) {
            const beforeSearchCookies = await context.cookies();
            const beforeSearchDocCookie = await page.evaluate(() => document.cookie);
            logSearchFlow(`[Cookie Stage: Before Search Page Navigation] context.cookies() count: ${beforeSearchCookies.length}`);
            beforeSearchCookies.forEach((c: Cookie) => {
              logSearchFlow(`  Cookie: ${c.name} | Domain: ${c.domain} | Path: ${c.path} | Expires: ${c.expires}`);
            });
            logSearchFlow(`[Cookie Stage: Before Search Page Navigation] document.cookie: ${beforeSearchDocCookie}`);
          }
        } catch (cookieErr: unknown) {
          logSearchFlow(`[Cookie Stage: Before Search Page Navigation Error] ${cookieErr instanceof Error ? cookieErr.message : String(cookieErr)}`);
        }

        logSearchFlow(`[Search Fallback] Navigating to search page: ${searchUrl}`);

        const waitUnitResults: { state: string; size: number; domCount: number }[] = [];

        const searchResponse = await page.goto(searchUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        const htmlDcl = await page.content();
        const countDcl = await page.evaluate(() => document.querySelectorAll('*').length);
        waitUnitResults.push({ state: 'domcontentloaded', size: htmlDcl.length, domCount: countDcl });

        try { await page.waitForLoadState('load', { timeout: 10000 }); } catch {}
        const htmlLoad = await page.content();
        const countLoad = await page.evaluate(() => document.querySelectorAll('*').length);
        waitUnitResults.push({ state: 'load', size: htmlLoad.length, domCount: countLoad });

        try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch {}
        const htmlIdle = await page.content();
        const countIdle = await page.evaluate(() => document.querySelectorAll('*').length);
        waitUnitResults.push({ state: 'networkidle', size: htmlIdle.length, domCount: countIdle });

        if (searchCDP) searchCDP.saveCDP();
        await this.diagnosticsStorageService.runAndSaveFingerprint(page);
        await this.diagnosticsStorageService.runAndSaveHTML(page, "search-page", ctx.cleanId);
        const searchStatus = searchResponse ? searchResponse.status() : 200;
        await this.capturePageState(page, context!, searchStatus);

        logSearchFlow(`=== [waitUntil State Comparison] ===`);
        waitUnitResults.forEach(r => {
          logSearchFlow(`State: ${r.state} | HTML Size: ${r.size} chars | DOM Count: ${r.domCount}`);
        });

        const jsStatus = await page.evaluate(() => {
          const win = window as unknown as { Alpine?: unknown; __NEXT_DATA__?: unknown; __NUXT__?: unknown; Recombee?: unknown };
          return {
            readyState: document.readyState,
            alpineType: typeof win.Alpine,
            nextDataType: typeof win.__NEXT_DATA__,
            nuxtType: typeof win.__NUXT__,
            recombeeType: typeof win.Recombee,
            fetchType: typeof window.fetch,
            alpineVal: win.Alpine ? String(win.Alpine) : 'undefined',
            nextDataVal: win.__NEXT_DATA__ ? JSON.stringify(win.__NEXT_DATA__).substring(0, 200) : 'undefined',
            nuxtVal: win.__NUXT__ ? JSON.stringify(win.__NUXT__).substring(0, 200) : 'undefined',
            recombeeVal: win.Recombee ? String(win.Recombee) : 'undefined',
          };
        });

        logSearchFlow(`=== [JavaScript Environment Status] ===`);
        logSearchFlow(`document.readyState: ${jsStatus.readyState}`);
        logSearchFlow(`window.Alpine: type=${jsStatus.alpineType} | val=${jsStatus.alpineVal}`);
        logSearchFlow(`window.__NEXT_DATA__: type=${jsStatus.nextDataType} | val=${jsStatus.nextDataVal}`);
        logSearchFlow(`window.__NUXT__: type=${jsStatus.nuxtType} | val=${jsStatus.nuxtVal}`);
        logSearchFlow(`window.Recombee: type=${jsStatus.recombeeType} | val=${jsStatus.recombeeVal}`);
        logSearchFlow(`window.fetch: type=${jsStatus.fetchType}`);

        try {
          const pageContent = await page.content();
          const docOuter = await page.evaluate(() => document.documentElement.outerHTML);
          const bodyInner = await page.evaluate(() => document.body ? document.body.innerHTML : '');

          fs.writeFileSync(path.join(process.cwd(), 'search-page-content.html'), pageContent, 'utf-8');
          fs.writeFileSync(path.join(process.cwd(), 'search-document-outer.html'), docOuter, 'utf-8');
          fs.writeFileSync(path.join(process.cwd(), 'search-body-inner.html'), bodyInner, 'utf-8');

          logSearchFlow(`[Files Saved] Saved search-page-content.html, search-document-outer.html, and search-body-inner.html`);
        } catch (fileErr: unknown) {
          logSearchFlow(`[Files Saved Error] Failed to write files: ${fileErr instanceof Error ? fileErr.message : String(fileErr)}`);
        }

        const specificCounts = await page.evaluate(() => {
          return {
            total: document.querySelectorAll('*').length,
            thumbnail: document.querySelectorAll('.thumbnail').length,
            group: document.querySelectorAll('.group').length,
            a: document.querySelectorAll('a').length,
            article: document.querySelectorAll('article').length,
            img: document.querySelectorAll('img').length
          };
        });

        logSearchFlow(`=== [DOM Element Counts] ===`);
        logSearchFlow(`Total DOM Elements (*): ${specificCounts.total}`);
        logSearchFlow(`.thumbnail: ${specificCounts.thumbnail}`);
        logSearchFlow(`.group: ${specificCounts.group}`);
        logSearchFlow(`a: ${specificCounts.a}`);
        logSearchFlow(`article: ${specificCounts.article}`);
        logSearchFlow(`img: ${specificCounts.img}`);

        const contextCookies = await context!.cookies();
        const docCookie = await page.evaluate(() => document.cookie);

        logSearchFlow(`=== [Cookies Diagnostics] ===`);
        logSearchFlow(`[Cookie Stage: After Search Page Display] context.cookies() count: ${contextCookies.length}`);
        contextCookies.forEach((c: Cookie) => {
          logSearchFlow(`  Cookie: ${c.name} | Domain: ${c.domain} | Path: ${c.path} | Expires: ${c.expires}`);
        });
        logSearchFlow(`[Cookie Stage: After Search Page Display] document.cookie: ${docCookie}`);

        logSearchFlow(`=== [Console logs during navigation] ===`);
        logSearchFlow(`Total console messages: ${consoleMessages.length}`);
        consoleMessages.slice(0, 50).forEach(m => logSearchFlow(`  ${m}`));

        logSearchFlow(`=== [Page errors during navigation] ===`);
        logSearchFlow(`Total page errors: ${pageErrors.length}`);
        pageErrors.forEach(e => logSearchFlow(`  ${e}`));

        logSearchFlow(`=== [Network API requests during navigation] ===`);
        logSearchFlow(`Total requests captured: ${apiRequests.length}`);
        apiRequests.forEach(reqLog => logSearchFlow(`  REQUEST: ${reqLog}`));

        logSearchFlow(`=== [Network API responses during navigation] ===`);
        logSearchFlow(`Total responses captured: ${apiResponses.length}`);
        apiResponses.forEach(resLog => logSearchFlow(`  RESPONSE: ${resLog}`));

        page.off('request', handleRequest);
        page.off('response', handleResponse);
        page.off('console', handleConsole);
        page.off('pageerror', handlePageError);

        try {
          logSearchFlow("[Search Fallback] Waiting for dynamically rendered movie cards inside thumbnail group...");
          await page.waitForFunction(() => {
            const links = Array.from(document.querySelectorAll('div.thumbnail a'));
            return links.some(a => {
              const href = a.getAttribute('href') || '';
              return href && !href.startsWith('#') && !href.startsWith('javascript:');
            });
          }, { timeout: 10000 });
          logSearchFlow("[Search Fallback] Movie card element detected!");
        } catch (waitErr: unknown) {
          logSearchFlow(`[Search Fallback Warning] Waiting for movie card timed out or finished: ${waitErr instanceof Error ? waitErr.message : String(waitErr)}`);
        }

        const allHrefsData = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('div.thumbnail a')).map(el => {
            const a = el as HTMLAnchorElement;
            return {
              href: a.href || '',
              text: a.textContent?.trim() || '',
              className: a.className || '',
              parentClass: a.parentElement?.className || '',
              grandParentClass: a.parentElement?.parentElement?.className || ''
            };
          });
        });

        logSearchFlow(`[Verbose Scrape] Total <a> tags found inside movie thumbnails: ${allHrefsData.length}`);
        allHrefsData.forEach((link, idx) => {
          logSearchFlow(`ThumbnailLink[${idx}]: href="${link.href}" text="${link.text}" class="${link.className}" parentClass="${link.parentClass}" grandParentClass="${link.grandParentClass}"`);
        });

        const hrefs = allHrefsData.map(d => d.href);

        const candidates = Array.from(new Set(hrefs)).filter((href: string): href is string => {
          if (!href) return false;
          if (href.startsWith('#') || href.startsWith('javascript:')) return false;
          
          const excludedKeywords = [
            '/search/', '/genres/', '/makers/', '/actresses/', '/release/', 
            '/uncensored-leak/', '/contact/', '/terms/', '/ads/', '/upload', 
            '/new', '/dm', '/ja/site/', '/history', '/vip', '/saved', '/playlists'
          ];
          const isExcluded = excludedKeywords.some(kw => href.includes(kw));
          if (isExcluded) return false;

          const urlParts = href.split('/');
          const lastSegment = urlParts[urlParts.length - 1] || '';
          return Boolean(lastSegment && lastSegment !== 'ja');
        });

        searchResultCount = candidates.length;
        logSearchFlow(`Search Result Count: ${searchResultCount}`);
        logSearchFlow(`[候補URL一覧] ${JSON.stringify(candidates)}`);

        const foundUrl = HtmlParserService.matchSearchCandidateUrl(candidates, ctx.cleanId);

        matchedUrlText = foundUrl || 'なし';
        logSearchFlow(`Matched URL: ${matchedUrlText}`);

        if (foundUrl) {
          logSearchFlow(`Navigate Detail: ${foundUrl}`);
          
          const detailResponse = await page.goto(foundUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });
          
          try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch {}
          try { await page.waitForSelector('body', { timeout: 15000 }); } catch {}

          status = detailResponse ? detailResponse.status() : 200;
          try { finalUrl = page.url(); } catch { finalUrl = foundUrl; }
          try { pageTitle = await page.title(); } catch { pageTitle = ''; }
          try { html = await page.content(); } catch { html = ''; }

          this.logger.info(`[再アクセス後URL] ${finalUrl}`);

          docInfo = await this.extractDocInfoFromPage(page);

          const fallbackValidation = HtmlParserService.validateDetailPage(docInfo, html, status, finalUrl, Boolean(page));
          const fallbackIsInvalid = fallbackValidation.isInvalid;

          logSearchFlow(`[作品ページ判定結果] fallbackIsInvalid: ${fallbackIsInvalid} (reason: ${fallbackValidation.reason}, status: ${status})`);

          if (fallbackIsInvalid) {
            logSearchFlow(`[Search Fallback] Detailed page resolved via fallback is still invalid.`);
          } else {
            logSearchFlow(`Parse Success: ${docInfo.title}`);
            fallbackSuccess = true;
          }
        } else {
          logSearchFlow(`[Search Fallback] No matched detail URL resolved from search page.`);
        }
      } catch (fallbackErr: unknown) {
        logSearchFlow(`[Search Fallback] Error occurred: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`);
      }
    }

    if (!fallbackSuccess) {
      const notFoundReason = `Search fallback failed. Checked ${searchResultCount} candidates. Matched URL: ${matchedUrlText}.`;
      logSearchFlow(`\nReturning NotFound\nReason: ${notFoundReason}`);
      status = 404;
      return {
        status: 'NotFound',
        notFoundResponse: this.metadataBuilder.build({
          productId: ctx.cleanId,
          status: 'NotFound',
          error: 'MissAVに作品が存在しません',
          docInfo,
          html,
          debug: {
            finalUrl,
            pageTitle: docInfo.title || pageTitle,
            htmlLength: html.length,
            htmlPreview: html.substring(0, 1000),
            bodyPreview: ctx.bodyPreview,
            titleTag: ctx.titleTag,
            matchedSelectors: ctx.matchedSelectors,
            unmatchedSelectors: ctx.unmatchedSelectors,
            selectorResults: ctx.selectorResults,
            ldJsonCount: (html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>/g) || []).length,
            hasNextData: html.includes('__NEXT_DATA__'),
            hasLdJson: html.includes('application/ld+json'),
            hasVideo: html.includes('video'),
            status: 404,
            cloudflareReasons: [],
            searchFlowLogs: ctx.searchFlowLogs,
            exceptionMessage: ctx.exceptionMessage,
            exceptionStack: ctx.exceptionStack
          }
        }),
        page,
        context,
        browser,
        docInfo,
        statusNum: status,
        finalUrl,
        pageTitle,
        html
      };
    }

    return {
      status: 'Success',
      page,
      context,
      browser,
      docInfo,
      statusNum: status,
      finalUrl,
      pageTitle,
      html
    };
  }

  private async injectEvasion(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
  }

  private async capturePageState(page: IdentifiedPage, context: BrowserContext, status: number): Promise<Record<string, unknown> | null> {
    try {
      const title = await page.title().catch(() => '');
      const html = await page.content().catch(() => '');
      const cookies = await context.cookies().catch(() => []);
      return { status, title, htmlLen: html.length, cookiesCount: cookies.length };
    } catch {
      return null;
    }
  }

  private async extractDocInfoFromPage(page: IdentifiedPage): Promise<DocumentInfo> {
    return page.evaluate(() => {
      const title = document.title || '';
      const h1 = document.querySelector('h1')?.textContent?.trim() || '';
      const titleDom = document.querySelector('.text-base.font-medium, h1.text-base')?.textContent?.trim() || '';
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
      const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      const actressEls = Array.from(document.querySelectorAll('a[href*="/actresses/"]'));
      const actresses = actressEls.map(e => e.textContent?.trim()).filter(Boolean).join(', ');
      const makerEl = document.querySelector('a[href*="/makers/"]');
      const maker = makerEl?.textContent?.trim() || '';
      return { title, h1, titleDom, canonical, description, actresses, maker };
    });
  }
}

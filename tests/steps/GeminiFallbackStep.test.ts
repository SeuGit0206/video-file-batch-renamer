import fs from 'fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GeminiFallbackStep } from '../../src/steps/GeminiFallbackStep';
import { ScrapingContext } from '../../src/steps/ScrapingContext';
import { MetadataBuilder } from '../../src/builders/MetadataBuilder';
import type { BrowserConfigFactory } from '../../src/browser/BrowserConfigFactory';
import type { BrowserSettingsProvider } from '../../src/browser/BrowserSettingsProvider';
import type { PlaywrightBrowserService } from '../../src/browser/PlaywrightBrowserService';
import { BROWSER_CLOSE_TIMEOUT_MS } from '../../src/browser/PlaywrightBrowserService';
import type { IdentifiedPage } from '../../src/browser/types';
import type { ICdpDiagnosticsService, IDiagnosticsStorageService, ILogger } from '../../src/services';

describe('GeminiFallbackStep search fallback failures', () => {
  let logger: ILogger;
  let configFactory: BrowserConfigFactory;
  let settingsProvider: BrowserSettingsProvider;
  let cdpService: ICdpDiagnosticsService;
  let diagnosticsStorage: IDiagnosticsStorageService;

  beforeEach(() => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as ILogger;
    configFactory = {
      createContextOptions: vi.fn().mockReturnValue({}),
      createLaunchOptions: vi.fn().mockReturnValue({}),
    } as unknown as BrowserConfigFactory;
    settingsProvider = {} as BrowserSettingsProvider;
    cdpService = {
      setupCDPTracking: vi.fn().mockResolvedValue({ saveCDP: vi.fn(), client: null }),
    } as unknown as ICdpDiagnosticsService;
    diagnosticsStorage = {
      runAndSaveFingerprint: vi.fn().mockResolvedValue(undefined),
      runAndSaveHTML: vi.fn().mockResolvedValue(undefined),
    } as unknown as IDiagnosticsStorageService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createInvalidContext() {
    const ctx = new ScrapingContext('abc-123', 'https://missav.ai/ja/');
    ctx.status = 404;
    ctx.finalUrl = ctx.url;
    ctx.html = '<html><body>Not Found</body></html>';
    return ctx;
  }

  function createStep(browserService: PlaywrightBrowserService) {
    return new GeminiFallbackStep(
      settingsProvider,
      configFactory,
      logger,
      new MetadataBuilder(),
      cdpService,
      diagnosticsStorage,
      () => browserService
    );
  }

  function createSearchBrowser(allHrefsData: Array<{
    href: string;
    text: string;
    className: string;
    parentClass: string;
    grandParentClass: string;
  }>, detailDocInfo?: Record<string, string>) {
    const evaluate = vi.fn()
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce({
        readyState: 'complete',
        alpineType: 'undefined',
        nextDataType: 'undefined',
        nuxtType: 'undefined',
        recombeeType: 'undefined',
        fetchType: 'function',
        alpineVal: 'undefined',
        nextDataVal: 'undefined',
        nuxtVal: 'undefined',
        recombeeVal: 'undefined',
      })
      .mockResolvedValueOnce('<html></html>')
      .mockResolvedValueOnce('<body></body>')
      .mockResolvedValueOnce({ total: 10, thumbnail: 1, group: 1, a: 1, article: 0, img: 0 })
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce(allHrefsData);

    if (detailDocInfo) {
      evaluate.mockResolvedValueOnce(detailDocInfo);
    }

    const page = {
      hashId: '',
      on: vi.fn(),
      off: vi.fn(),
      goto: vi.fn().mockResolvedValue({ status: vi.fn().mockReturnValue(200) }),
      content: vi.fn().mockResolvedValue('<html><body><video></video></body></html>'),
      title: vi.fn().mockResolvedValue('検索結果'),
      url: vi.fn().mockReturnValue('https://missav.ai/ja/abc-123'),
      evaluate,
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      waitForFunction: vi.fn().mockRejectedValue(new Error('検索結果待機タイムアウト')),
      waitForSelector: vi.fn().mockResolvedValue(undefined),
    } as unknown as IdentifiedPage;
    const context = {
      addInitScript: vi.fn().mockResolvedValue(undefined),
      cookies: vi.fn().mockResolvedValue([]),
    };
    const browser = { isConnected: vi.fn().mockReturnValue(true) };
    const service = {
      initialize: vi.fn().mockResolvedValue(browser),
      createContext: vi.fn().mockResolvedValue(context),
      createPage: vi.fn().mockResolvedValue(page),
      dispose: vi.fn().mockResolvedValue(undefined),
    } as unknown as PlaywrightBrowserService;

    return { service, page, context, browser };
  }

  it('ブラウザ再作成に失敗しても例外終了せずNotFoundを返す', async () => {
    const ctx = createInvalidContext();
    const service = {
      initialize: vi.fn().mockRejectedValue(new Error('Chromiumを起動できません')),
      createContext: vi.fn(),
      createPage: vi.fn(),
      dispose: vi.fn(),
    } as unknown as PlaywrightBrowserService;

    await expect(createStep(service).execute(ctx)).resolves.toBeUndefined();

    expect(ctx.earlyReturnResult).toMatchObject({
      productId: 'ABC-123',
      status: 'NotFound',
      error: 'MissAVに作品が存在しません',
    });
    expect(ctx.page).toBeNull();
    expect(ctx.searchFlowLogs).toEqual(expect.arrayContaining([
      expect.stringContaining('Failed to recreate browser/page: Chromiumを起動できません'),
      expect.stringContaining('Returning NotFound'),
    ]));
  });

  it('無効リンクだけの検索結果を候補から除外してNotFoundを返す', async () => {
    const ctx = createInvalidContext();
    const invalidLinks = [
      '',
      '#section',
      'javascript:void(0)',
      'https://missav.ai/ja/search/abc-123',
      'https://missav.ai/ja/genres/action',
      'https://missav.ai/ja',
    ].map((href) => ({ href, text: '', className: '', parentClass: '', grandParentClass: '' }));
    const { service, page } = createSearchBrowser(invalidLinks);

    await expect(createStep(service).execute(ctx)).resolves.toBeUndefined();

    expect(ctx.earlyReturnResult).toMatchObject({
      status: 'NotFound',
      error: 'MissAVに作品が存在しません',
      debug: expect.objectContaining({
        status: 404,
        searchFlowLogs: expect.arrayContaining([
          'Search Result Count: 0',
          'Matched URL: なし',
        ]),
      }),
    });
    expect(page.goto).toHaveBeenCalledTimes(1);
  });

  it('完全一致URLの遷移先が無効なら成功扱いせずNotFoundを返す', async () => {
    const ctx = createInvalidContext();
    const matchedUrl = 'https://missav.ai/ja/abc-123';
    const links = [{
      href: matchedUrl,
      text: 'ABC-123',
      className: '',
      parentClass: '',
      grandParentClass: '',
    }];
    const invalidDocInfo = {
      title: 'Not Found',
      h1: 'Not Found',
      titleDom: '',
      canonical: matchedUrl,
      description: '',
      actresses: '',
      maker: '',
    };
    const { service, page } = createSearchBrowser(links, invalidDocInfo);

    await expect(createStep(service).execute(ctx)).resolves.toBeUndefined();

    expect(page.goto).toHaveBeenNthCalledWith(1, 'https://missav.ai/ja/search/abc-123', expect.any(Object));
    expect(page.goto).toHaveBeenNthCalledWith(2, matchedUrl, expect.any(Object));
    expect(ctx.earlyReturnResult).toMatchObject({
      status: 'NotFound',
      error: 'MissAVに作品が存在しません',
      debug: expect.objectContaining({
        status: 404,
        searchFlowLogs: expect.arrayContaining([
          'Search Result Count: 1',
          `Matched URL: ${matchedUrl}`,
          expect.stringContaining('Detailed page resolved via fallback is still invalid'),
        ]),
      }),
    });
  });

  it('既存資源を終了してから検索用Browserへ置き換える', async () => {
    const ctx = createInvalidContext();
    const oldPageClose = vi.fn().mockResolvedValue(undefined);
    const oldPage = { close: oldPageClose } as unknown as IdentifiedPage;
    const oldContext = { close: vi.fn().mockResolvedValue(undefined) };
    const oldBrowser = { close: vi.fn().mockResolvedValue(undefined) };
    const oldService = {
      initialize: vi.fn().mockResolvedValue(oldBrowser),
      createContext: vi.fn().mockResolvedValue(oldContext),
      createPage: vi.fn().mockResolvedValue(oldPage),
      dispose: vi.fn().mockImplementation(() => oldBrowser.close()),
    } as unknown as PlaywrightBrowserService;
    ctx.page = oldPage;
    ctx.context = oldContext as unknown as typeof ctx.context;
    ctx.browser = oldBrowser as unknown as typeof ctx.browser;

    const matchedUrl = 'https://missav.ai/ja/abc-123';
    const links = [{
      href: matchedUrl,
      text: 'ABC-123',
      className: '',
      parentClass: '',
      grandParentClass: '',
    }];
    const validDocInfo = {
      title: 'ABC-123 Sample',
      h1: 'ABC-123 Sample',
      titleDom: 'ABC-123 Sample',
      canonical: matchedUrl,
      description: 'ABC-123 Sample',
      actresses: '',
      maker: '',
    };
    const { service, page, context, browser } = createSearchBrowser(links, validDocInfo);

    await expect(createStep(service).execute(ctx)).resolves.toBeUndefined();

    expect(service).not.toBe(oldService);
    expect(service.dispose).not.toHaveBeenCalled();
    expect(oldService.dispose).not.toHaveBeenCalled();
    expect(oldPage.close).toHaveBeenCalledTimes(1);
    expect(oldContext.close).toHaveBeenCalledTimes(1);
    expect(oldBrowser.close).toHaveBeenCalledTimes(1);
    expect(oldPageClose.mock.invocationCallOrder[0]).toBeLessThan(oldContext.close.mock.invocationCallOrder[0]);
    expect(oldContext.close.mock.invocationCallOrder[0]).toBeLessThan(oldBrowser.close.mock.invocationCallOrder[0]);
    expect(service.initialize).toHaveBeenCalledTimes(1);
    expect(service.createContext).toHaveBeenCalledTimes(1);
    expect(service.createPage).toHaveBeenCalledTimes(1);
    expect(ctx.page).toBe(page);
    expect(ctx.context).toBe(context);
    expect(ctx.browser).toBe(browser);
    expect(ctx.browser).not.toBe(oldBrowser);
  });

  it('既存資源の終了が失敗しても新しい資源で検索フォールバックを続行する', async () => {
    const ctx = createInvalidContext();
    const oldPage = { close: vi.fn().mockRejectedValue(new Error('page close failed')) } as unknown as IdentifiedPage;
    const oldContext = { close: vi.fn().mockRejectedValue(new Error('context close failed')) };
    const oldBrowser = { close: vi.fn().mockRejectedValue(new Error('browser close failed')) };
    ctx.page = oldPage;
    ctx.context = oldContext as unknown as typeof ctx.context;
    ctx.browser = oldBrowser as unknown as typeof ctx.browser;

    const matchedUrl = 'https://missav.ai/ja/abc-123';
    const links = [{ href: matchedUrl, text: 'ABC-123', className: '', parentClass: '', grandParentClass: '' }];
    const validDocInfo = {
      title: 'ABC-123 Sample', h1: 'ABC-123 Sample', titleDom: 'ABC-123 Sample',
      canonical: matchedUrl, description: 'ABC-123 Sample', actresses: '', maker: '',
    };
    const { service, page, context, browser } = createSearchBrowser(links, validDocInfo);

    await expect(createStep(service).execute(ctx)).resolves.toBeUndefined();

    expect(oldPage.close).toHaveBeenCalledTimes(1);
    expect(oldContext.close).toHaveBeenCalledTimes(1);
    expect(oldBrowser.close).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('page close failed'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('context close failed'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('browser close failed'));
    expect(ctx.page).toBe(page);
    expect(ctx.context).toBe(context);
    expect(ctx.browser).toBe(browser);
  });

  it('既存Browserのcloseが停止してもtimeout後に新しい資源へ置き換える', async () => {
    vi.useFakeTimers();
    try {
      const ctx = createInvalidContext();
      const oldBrowser = { close: vi.fn().mockReturnValue(new Promise<void>(() => {})) };
      ctx.browser = oldBrowser as unknown as typeof ctx.browser;

      const matchedUrl = 'https://missav.ai/ja/abc-123';
      const links = [{ href: matchedUrl, text: 'ABC-123', className: '', parentClass: '', grandParentClass: '' }];
      const validDocInfo = {
        title: 'ABC-123 Sample', h1: 'ABC-123 Sample', titleDom: 'ABC-123 Sample',
        canonical: matchedUrl, description: 'ABC-123 Sample', actresses: '', maker: '',
      };
      const { service, browser } = createSearchBrowser(links, validDocInfo);
      const execution = createStep(service).execute(ctx);
      await Promise.resolve();

      expect(service.initialize).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(BROWSER_CLOSE_TIMEOUT_MS);
      await expect(execution).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`timed out after ${BROWSER_CLOSE_TIMEOUT_MS}ms`));
      expect(ctx.browser).toBe(browser);
    } finally {
      vi.useRealTimers();
    }
  });
});

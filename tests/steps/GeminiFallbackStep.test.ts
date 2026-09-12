import fs from 'fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GeminiFallbackStep } from '../../src/steps/GeminiFallbackStep';
import { ScrapingContext } from '../../src/steps/ScrapingContext';
import { MetadataBuilder } from '../../src/builders/MetadataBuilder';
import type { BrowserConfigFactory } from '../../src/browser/BrowserConfigFactory';
import type { BrowserSettingsProvider } from '../../src/browser/BrowserSettingsProvider';
import type { PlaywrightBrowserService } from '../../src/browser/PlaywrightBrowserService';
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
      content: vi.fn().mockResolvedValue('<html><body>検索結果</body></html>'),
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

    return { service, page };
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
});

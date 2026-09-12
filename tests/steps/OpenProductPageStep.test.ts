import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenProductPageStep } from '../../src/steps/OpenProductPageStep';
import { ScrapingContext } from '../../src/steps/ScrapingContext';
import type { ILogger, ICdpDiagnosticsService, IDiagnosticsStorageService } from '../../src/services';
import type { BrowserSettingsProvider } from '../../src/browser/BrowserSettingsProvider';
import type { BrowserConfigFactory } from '../../src/browser/BrowserConfigFactory';
import type { PlaywrightBrowserService } from '../../src/browser/PlaywrightBrowserService';
import type { IdentifiedPage } from '../../src/browser/types';
import { HTTP_STATUS } from '../../src/constants';
import { ScraperError } from '../../src/errors';

describe('OpenProductPageStep Unit Tests', () => {
  let mockLogger: ILogger;
  let mockCdpService: ICdpDiagnosticsService;
  let mockStorageService: IDiagnosticsStorageService;
  let mockSettingsProvider: BrowserSettingsProvider;
  let mockConfigFactory: BrowserConfigFactory;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as ILogger;

    mockCdpService = {
      setupCDPTracking: vi.fn().mockResolvedValue({
        saveCDP: vi.fn(),
        client: null,
      }),
    } as unknown as ICdpDiagnosticsService;

    mockStorageService = {
      ensureDiagnosticsDir: vi.fn(),
      savePlaywrightDiff: vi.fn(),
      savePageComparison: vi.fn(),
      saveCDPLog: vi.fn(),
      saveFingerprint: vi.fn(),
      saveHtmlLog: vi.fn(),
      runAndSaveFingerprint: vi.fn().mockResolvedValue(undefined),
      runAndSaveHTML: vi.fn().mockResolvedValue(undefined),
    } as unknown as IDiagnosticsStorageService;

    mockSettingsProvider = {
      load: vi.fn().mockReturnValue({ headless: true }),
      save: vi.fn(),
    } as unknown as BrowserSettingsProvider;

    mockConfigFactory = {
      createContextOptions: vi.fn().mockReturnValue({}),
      createLaunchOptions: vi.fn().mockReturnValue({}),
    } as unknown as BrowserConfigFactory;
  });

  function createMockBrowserService(mockPage: unknown) {
    const mockContext = {
      cookies: vi.fn().mockResolvedValue([]),
      addCookies: vi.fn().mockResolvedValue(undefined),
      addInitScript: vi.fn().mockResolvedValue(undefined),
      newPage: vi.fn().mockResolvedValue(mockPage),
      on: vi.fn(),
    };

    const mockBrowser = {
      newContext: vi.fn().mockResolvedValue(mockContext),
      close: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockReturnValue(true),
    };

    const service = {
      initialize: vi.fn().mockResolvedValue(mockBrowser),
      createContext: vi.fn().mockResolvedValue(mockContext),
      createPage: vi.fn().mockResolvedValue(mockPage as IdentifiedPage),
      getBrowser: vi.fn().mockReturnValue(mockBrowser),
      getContexts: vi.fn().mockReturnValue([mockContext]),
      dispose: vi.fn().mockResolvedValue(undefined),
      getHash: vi.fn().mockReturnValue('MockBrowserHash'),
      getPageHash: vi.fn().mockReturnValue('MockPageHash'),
    } as unknown as PlaywrightBrowserService;

    return { service, mockBrowser, mockContext };
  }

  it('直接アクセスが200で成功する場合、検索フォールバックを実行せずに正常終了すること', async () => {
    const ctx = new ScrapingContext('abc-123', 'https://missav.ai/ja/');
    const mockPage = {
      hashId: 'page-1',
      url: vi.fn().mockReturnValue('https://missav.ai/ja/abc-123'),
      title: vi.fn().mockResolvedValue('ABC-123 サンプルタイトル - MissAV'),
      content: vi.fn().mockResolvedValue('<html><body><h1>ABC-123</h1></body></html>'),
      goto: vi.fn().mockResolvedValue({
        status: vi.fn().mockReturnValue(200),
      }),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue({}),
      on: vi.fn(),
    };

    const { service } = createMockBrowserService(mockPage);

    const step = new OpenProductPageStep(
      mockSettingsProvider,
      mockConfigFactory,
      mockLogger,
      mockCdpService,
      mockStorageService,
      () => service
    );

    await step.execute(ctx);

    expect(ctx.status).toBe(200);
    expect(mockPage.goto).toHaveBeenCalledTimes(1);
    expect(mockPage.goto).toHaveBeenCalledWith('https://missav.ai/ja/abc-123', expect.any(Object));
  });

  it('直接アクセスが404の場合、検索フォールバックで完全一致URLに遷移してctx.urlを更新すること', async () => {
    const ctx = new ScrapingContext('ssni-001', 'https://missav.ai/ja/');
    const gotoCalls: string[] = [];

    const mockPage = {
      hashId: 'page-1',
      url: vi.fn().mockImplementation(() => {
        const last = gotoCalls[gotoCalls.length - 1];
        return last || 'https://missav.ai/ja/ssni-001';
      }),
      title: vi.fn().mockImplementation(async () => {
        if (gotoCalls.length === 1) return '404 Page Not Found - MissAV';
        return 'SSNI-001 サンプル作品 - MissAV';
      }),
      content: vi.fn().mockResolvedValue('<html><body><h1>SSNI-001</h1></body></html>'),
      goto: vi.fn().mockImplementation(async (url: string) => {
        gotoCalls.push(url);
        if (url === 'https://missav.ai/ja/ssni-001') {
          return { status: () => 404 };
        }
        return { status: () => 200 };
      }),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockImplementation(async (fn: unknown) => {
        if (typeof fn === 'function') {
          return 'https://missav.ai/dm64/ja/ssni-001';
        }
        return {};
      }),
      on: vi.fn(),
    };

    const { service } = createMockBrowserService(mockPage);

    const step = new OpenProductPageStep(
      mockSettingsProvider,
      mockConfigFactory,
      mockLogger,
      mockCdpService,
      mockStorageService,
      () => service
    );

    await step.execute(ctx);

    expect(gotoCalls).toEqual([
      'https://missav.ai/ja/ssni-001',
      'https://missav.ai/ja/search/SSNI-001',
      'https://missav.ai/dm64/ja/ssni-001',
    ]);
    expect(ctx.url).toBe('https://missav.ai/dm64/ja/ssni-001');
    expect(ctx.status).toBe(200);
  });

  it('直接アクセスが404で、検索結果に完全一致リンクが存在しない（部分一致のみ等）場合はメタデータ未検出（404）となること', async () => {
    const ctx = new ScrapingContext('ssni-001', 'https://missav.ai/ja/');
    const gotoCalls: string[] = [];

    const mockPage = {
      hashId: 'page-1',
      url: vi.fn().mockReturnValue('https://missav.ai/ja/ssni-001'),
      title: vi.fn().mockResolvedValue('404 Not Found'),
      content: vi.fn().mockResolvedValue('<html><body>Not Found</body></html>'),
      goto: vi.fn().mockImplementation(async (url: string) => {
        gotoCalls.push(url);
        return { status: () => 404 };
      }),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockImplementation(async (fn: unknown) => {
        if (typeof fn === 'function') {
          // 部分一致のみで完全一致が見つからない場合
          return null;
        }
        return {};
      }),
      on: vi.fn(),
    };

    const { service } = createMockBrowserService(mockPage);

    const step = new OpenProductPageStep(
      mockSettingsProvider,
      mockConfigFactory,
      mockLogger,
      mockCdpService,
      mockStorageService,
      () => service
    );

    await step.execute(ctx);

    expect(gotoCalls).toEqual([
      'https://missav.ai/ja/ssni-001',
      'https://missav.ai/ja/search/SSNI-001',
    ]);
    expect(ctx.status).toBe(HTTP_STATUS.NOT_FOUND);
  });

  it('page.goto が通信例外を投げても診断情報を保存して安全に終了すること', async () => {
    const ctx = new ScrapingContext('abc-123', 'https://missav.ai/ja/');
    const networkError = new Error('接続がリセットされました');
    const mockPage = {
      hashId: 'page-error',
      url: vi.fn().mockReturnValue('https://missav.ai/ja/abc-123'),
      title: vi.fn().mockResolvedValue('接続エラー'),
      content: vi.fn().mockResolvedValue('<html><body>接続エラー</body></html>'),
      goto: vi.fn().mockRejectedValue(networkError),
      waitForLoadState: vi.fn(),
      waitForSelector: vi.fn(),
      evaluate: vi.fn().mockResolvedValue({}),
      on: vi.fn(),
    };
    const { service } = createMockBrowserService(mockPage);
    const step = new OpenProductPageStep(
      mockSettingsProvider,
      mockConfigFactory,
      mockLogger,
      mockCdpService,
      mockStorageService,
      () => service
    );

    await expect(step.execute(ctx)).resolves.toBeUndefined();

    expect(ctx.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(ctx.exceptionMessage).toBe(networkError.message);
    expect(ctx.exceptionStack).toBe(networkError.stack);
    expect(ctx.finalUrl).toBe('https://missav.ai/ja/abc-123');
    expect(ctx.page403Data).toEqual({
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      title: '接続エラー',
      htmlLen: '<html><body>接続エラー</body></html>'.length,
      cookiesCount: 0,
    });
    expect(ctx.cfTimeline).toEqual(expect.arrayContaining([
      expect.objectContaining({ event: 'Navigation Failed', error: networkError.message }),
    ]));
  });

  it('HTTP 200でもタイトルが空なら正常な商品ページとして扱わないこと', async () => {
    const ctx = new ScrapingContext('abc-123', 'https://missav.ai/ja/');
    const html = '<html><body><h1>ABC-123</h1></body></html>';
    const mockPage = {
      hashId: 'page-empty-title',
      url: vi.fn().mockReturnValue('https://missav.ai/ja/abc-123'),
      title: vi.fn().mockResolvedValue(''),
      content: vi.fn().mockResolvedValue(html),
      goto: vi.fn().mockResolvedValue({ status: vi.fn().mockReturnValue(HTTP_STATUS.OK) }),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue({}),
      on: vi.fn(),
    };
    const { service } = createMockBrowserService(mockPage);
    const step = new OpenProductPageStep(
      mockSettingsProvider,
      mockConfigFactory,
      mockLogger,
      mockCdpService,
      mockStorageService,
      () => service
    );

    await expect(step.execute(ctx)).rejects.toMatchObject({
      name: ScraperError.name,
      message: 'ページ取得失敗（HTMLまたはタイトルが空です）',
      status: HTTP_STATUS.BAD_GATEWAY,
      debug: expect.objectContaining({
        finalUrl: 'https://missav.ai/ja/abc-123',
        pageTitle: 'Failed to retrieve page title',
        htmlLength: html.length,
        status: HTTP_STATUS.OK,
      }),
    });

    expect(ctx.status).toBe(HTTP_STATUS.OK);
    expect(ctx.pageTitle).toBe('');
    expect(ctx.html).toBe(html);
  });

  it('検索フォールバック中の通信失敗では元の404状態とURLを保持して安全に終了すること', async () => {
    const ctx = new ScrapingContext('ssni-001', 'https://missav.ai/ja/');
    const originalUrl = ctx.url;
    const searchError = new Error('検索ページへ接続できません');
    const initialResponse = { status: vi.fn().mockReturnValue(HTTP_STATUS.NOT_FOUND) };
    const mockPage = {
      hashId: 'page-search-error',
      url: vi.fn().mockReturnValue(originalUrl),
      title: vi.fn().mockResolvedValue('404 Page Not Found'),
      content: vi.fn().mockResolvedValue('<html><body>Not Found</body></html>'),
      goto: vi.fn()
        .mockResolvedValueOnce(initialResponse)
        .mockRejectedValueOnce(searchError),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue({}),
      on: vi.fn(),
    };
    const { service } = createMockBrowserService(mockPage);
    const step = new OpenProductPageStep(
      mockSettingsProvider,
      mockConfigFactory,
      mockLogger,
      mockCdpService,
      mockStorageService,
      () => service
    );

    await expect(step.execute(ctx)).resolves.toBeUndefined();

    expect(mockPage.goto).toHaveBeenNthCalledWith(1, originalUrl, expect.any(Object));
    expect(mockPage.goto).toHaveBeenNthCalledWith(
      2,
      'https://missav.ai/ja/search/SSNI-001',
      expect.any(Object)
    );
    expect(ctx.url).toBe(originalUrl);
    expect(ctx.finalUrl).toBe(originalUrl);
    expect(ctx.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(ctx.response).toBe(initialResponse);
    expect(ctx.exceptionMessage).toBe('');
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining(searchError.message));
  });
});

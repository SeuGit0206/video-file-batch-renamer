import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenProductPageStep } from '../../src/steps/OpenProductPageStep';
import { ScrapingContext } from '../../src/steps/ScrapingContext';
import type { ILogger, ICdpDiagnosticsService, IDiagnosticsStorageService } from '../../src/services';
import type { BrowserSettingsProvider } from '../../src/browser/BrowserSettingsProvider';
import type { BrowserConfigFactory } from '../../src/browser/BrowserConfigFactory';
import type { PlaywrightBrowserService } from '../../src/browser/PlaywrightBrowserService';
import type { IdentifiedPage } from '../../src/browser/types';
import { HTTP_STATUS } from '../../src/constants';

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
});

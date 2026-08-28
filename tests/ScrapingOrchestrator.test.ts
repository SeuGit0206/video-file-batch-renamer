import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Browser, BrowserContext, Page } from 'playwright';
import type * as FsType from 'fs';
import { ScrapingOrchestrator } from '../src/orchestrators/ScrapingOrchestrator';
import { PlaywrightBrowserService } from '../src/browser/PlaywrightBrowserService';
import { CloudflareService, CookieService, GeminiSearchService } from '../src/services';
import { HtmlParserService } from '../src/parsers';
import { ScraperError } from '../src/errors';
import { AppErrorCode } from '../src/errors/AppErrorCodes';
import { HTTP_STATUS } from '../src/constants';
import { mockDocInfo, mockScrapedMetadata } from './fixtures';
import { createMockPlaywrightObjects } from './mocks';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof FsType>('fs');
  return {
    ...actual,
    existsSync: vi.fn().mockImplementation((pathStr: FsType.PathLike) => {
      if (typeof pathStr === 'string' && (pathStr.includes('storage-state.json') || pathStr.includes('cookies.json'))) {
        return false;
      }
      return actual.existsSync(pathStr);
    }),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue('[]')
  };
});

describe('ScrapingOrchestrator', () => {
  const { mockPage, mockContext, mockBrowser } = createMockPlaywrightObjects();

  beforeEach(() => {
    vi.clearAllMocks();

    // PlaywrightBrowserService モック設定
    vi.spyOn(PlaywrightBrowserService.prototype, 'initialize').mockResolvedValue(mockBrowser as unknown as Browser);
    vi.spyOn(PlaywrightBrowserService.prototype, 'createContext').mockResolvedValue(mockContext as unknown as BrowserContext);
    vi.spyOn(PlaywrightBrowserService.prototype, 'createPage').mockResolvedValue(mockPage as unknown as Page);
    vi.spyOn(PlaywrightBrowserService.prototype, 'closePage').mockResolvedValue(undefined);
    vi.spyOn(PlaywrightBrowserService.prototype, 'closeContext').mockResolvedValue(undefined);
    vi.spyOn(PlaywrightBrowserService.prototype, 'dispose').mockResolvedValue(undefined);

    // CookieService モック設定
    vi.spyOn(CookieService, 'loadCookies').mockReturnValue([]);
    vi.spyOn(CookieService, 'saveCookies').mockImplementation(() => {});

    // CloudflareService デフォルト (Cloudflare未検知)
    vi.spyOn(CloudflareService, 'checkCloudflare').mockReturnValue([]);

    // HtmlParserService デフォルト設定
    vi.spyOn(HtmlParserService, 'validateDetailPage').mockReturnValue({ isInvalid: false, reason: '' });
    vi.spyOn(HtmlParserService, 'extractProductId').mockReturnValue({
      selector1: 'ABC-123',
      selector2: '',
      regex1: 'ABC-123',
      regex2: '',
      finalProductId: 'ABC-123'
    });
    vi.spyOn(HtmlParserService, 'cleanTitle').mockReturnValue('サンプルタイトル ABC-123');
    vi.spyOn(HtmlParserService, 'extractReleaseDate').mockReturnValue('2026-01-01');

    // Page evaluate モック処理調整
    mockPage.evaluate.mockImplementation(async (fn: unknown) => {
      if (typeof fn === 'function') {
        const fnStr = fn.toString();
        if (fnStr.includes('document.title')) {
          return mockDocInfo;
        }
        if (fnStr.includes('selectors.reduce')) {
          return {
            h1: { found: true, value: 'サンプルタイトル ABC-123' },
            video: { found: true, value: 'video' }
          };
        }
        if (fnStr.includes('document.body ? document.body.innerText')) {
          return 'サンプル本文テキスト';
        }
        if (fnStr.includes('document.querySelector(\'title\')')) {
          return '<title>サンプルタイトル ABC-123 - MissAV</title>';
        }
      }
      return null;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('正常系', () => {
    it('正常にスクレイピングが完了し、メタデータを返してリソースを後始末する', async () => {
      const orchestrator = new ScrapingOrchestrator();
      const metadata = await orchestrator.fetch('ABC-123');

      expect(metadata.productId).toBe('ABC-123');
      expect(metadata.title).toBe('サンプルタイトル ABC-123');
      expect(metadata.series).toBe('MissAV');

      // cleanup 保証確認
      expect(PlaywrightBrowserService.prototype.dispose).toHaveBeenCalled();
    });

    it('カスタム IMetadataBuilder を DI して動作する', async () => {
      const customMetadataBuilder = {
        build: vi.fn().mockReturnValue({
          productId: 'CUSTOM-123',
          title: 'カスタムビルダータイトル',
          actress: 'カスタム女優',
          releaseDate: '2026-05-05',
          series: 'CustomSeries',
          debug: { finalUrl: 'https://example.com' },
        }),
      };

      const orchestrator = new ScrapingOrchestrator(
        undefined,
        undefined,
        undefined,
        customMetadataBuilder
      );

      const metadata = await orchestrator.fetch('ABC-123');

      expect(customMetadataBuilder.build).toHaveBeenCalled();
      expect(metadata.productId).toBe('CUSTOM-123');
      expect(metadata.title).toBe('カスタムビルダータイトル');
    });

    it('カスタム IRetryPolicy および IStealthStrategy を DI して動作する', async () => {
      const customRetryPolicy = {
        getMaxRetries: vi.fn().mockReturnValue(1),
        shouldRetry: vi.fn().mockReturnValue(false),
        getWaitTime: vi.fn().mockReturnValue(100),
        getCloudflareTimeout: vi.fn().mockReturnValue(5000),
        getCloudflarePollInterval: vi.fn().mockReturnValue(100),
        getCloudflareMinWaitTime: vi.fn().mockReturnValue(1000),
        isCloudflareTimeout: vi.fn().mockReturnValue(false),
      };

      const customStealthStrategy = {
        wait: vi.fn().mockResolvedValue(undefined),
        handleCloudflareDetected: vi.fn().mockResolvedValue(undefined),
        applyStealthContextOptions: vi.fn((opts) => opts),
      };

      const orchestrator = new ScrapingOrchestrator(
        undefined,
        undefined,
        undefined,
        undefined,
        customRetryPolicy,
        customStealthStrategy
      );

      const metadata = await orchestrator.fetch('ABC-123');
      expect(metadata.productId).toBe('ABC-123');
    });
  });

  describe('Cloudflare 判定とHeadful切替・リトライ', () => {
    it('Cloudflareが検知された場合、Headfulモードへ切り替えてリトライし、成功時に結果を返す', async () => {
      let callCount = 0;
      vi.spyOn(CloudflareService, 'checkCloudflare').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return ['HTTP Status Code is 403'];
        }
        return [];
      });

      // Date.now を擬似的に進めて 5秒待機ループを回避
      const baseTime = 1000000;
      let timeOffset = 0;
      vi.spyOn(Date, 'now').mockImplementation(() => {
        timeOffset += 6000;
        return baseTime + timeOffset;
      });

      const orchestrator = new ScrapingOrchestrator();
      const metadata = await orchestrator.fetch('ABC-123');

      expect(metadata.productId).toBe('ABC-123');
      // Headless と Headful の2回 Browser が初期化されたことを確認
      expect(PlaywrightBrowserService.prototype.initialize).toHaveBeenCalledTimes(2);
      expect(PlaywrightBrowserService.prototype.initialize).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ headless: true })
      );
      expect(PlaywrightBrowserService.prototype.initialize).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ headless: false })
      );
    });
  });

  describe('Gemini フォールバック', () => {
    it('fallbackToGemini が呼び出された場合、GeminiSearchService を呼び出す', async () => {
      vi.spyOn(GeminiSearchService, 'fetchMetadataWithGeminiSearch').mockResolvedValue(mockScrapedMetadata);
      process.env.GEMINI_API_KEY = 'test_mock_api_key';

      const orchestrator = new ScrapingOrchestrator();
      const result = await orchestrator.fallbackToGemini('ABC-123');

      expect(GeminiSearchService.fetchMetadataWithGeminiSearch).toHaveBeenCalledWith(
        'ABC-123',
        expect.anything()
      );
      expect(result.productId).toBe('ABC-123');
    });

    it('GEMINI_API_KEY が未設定の場合、エラーをスローする', async () => {
      delete process.env.GEMINI_API_KEY;

      const orchestrator = new ScrapingOrchestrator();
      await expect(orchestrator.fallbackToGemini('ABC-123')).rejects.toThrow(
        'Gemini API client is not initialized'
      );
    });
  });

  describe('エラー処理とリソース解放 (Resource Cleanup)', () => {
    it('ブラウザ起動やアクセス失敗時にも、finallyブロックでcleanupが確実に実行される', async () => {
      mockPage.goto.mockRejectedValueOnce(new Error('Navigation Timeout'));

      const orchestrator = new ScrapingOrchestrator();

      await expect(orchestrator.fetch('ABC-123')).rejects.toThrow(ScraperError);

      // 失敗時でも cleanup() が確実に呼ばれたことを検証
      expect(PlaywrightBrowserService.prototype.dispose).toHaveBeenCalled();
    });

    it('抽出タイトルが空で Metadata エラーが発生する場合でも、404/METADATA_NOT_FOUND をスローし cleanup が確実に実行される', async () => {
      vi.spyOn(HtmlParserService, 'cleanTitle').mockReturnValue('');

      const orchestrator = new ScrapingOrchestrator();

      await expect(orchestrator.fetch('ABC-123')).rejects.toMatchObject({
        status: HTTP_STATUS.NOT_FOUND,
        code: AppErrorCode.METADATA_NOT_FOUND
      });

      // 失敗時でも cleanup() が確実に呼ばれたことを検証
      expect(PlaywrightBrowserService.prototype.dispose).toHaveBeenCalled();
    });

    it('メタデータが取得できない場合に ScraperError (404, METADATA_NOT_FOUND) をスローすること (Phase 91)', async () => {
      vi.spyOn(HtmlParserService, 'cleanTitle').mockReturnValue('');

      const orchestrator = new ScrapingOrchestrator();

      await expect(orchestrator.fetch('NONEXISTENT-999')).rejects.toMatchObject({
        status: HTTP_STATUS.NOT_FOUND,
        code: AppErrorCode.METADATA_NOT_FOUND
      });

      expect(PlaywrightBrowserService.prototype.dispose).toHaveBeenCalled();
    });
  });
});

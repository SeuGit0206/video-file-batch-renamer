import { describe, it, expect, vi } from 'vitest';
import { MetadataController } from '../src/controllers/MetadataController';
import { HTTP_STATUS } from '../src/constants';
import { ScraperError } from '../src/errors';
import { NullMetricsCollector } from '../src/metrics';
import { mockScrapedMetadata } from './fixtures';
import { createMockExpressContext } from './mocks';

describe('MetadataController', () => {
  describe('正常系', () => {
    it('正常なidパラメータが与えられた時、fetcherが呼ばれHTTP 200とJSONレスポンスを返す', async () => {
      const mockFetcher = vi.fn().mockResolvedValue(mockScrapedMetadata);
      const controller = new MetadataController(mockFetcher);
      const { req, res, statusMock, jsonMock } = createMockExpressContext({ id: 'abc-123' });

      await controller.getMetadata(req, res);

      expect(mockFetcher).toHaveBeenCalledWith('ABC-123');
      expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(jsonMock).toHaveBeenCalledWith(mockScrapedMetadata);
    });

    it('小文字や余分な空白を含むidが与えられた時、trim()とtoUpperCase()が適用されてfetcherに渡される', async () => {
      const mockFetcher = vi.fn().mockResolvedValue(mockScrapedMetadata);
      const controller = new MetadataController(mockFetcher);
      const { req, res } = createMockExpressContext({ id: '   xyz-789   ' });

      await controller.getMetadata(req, res);

      expect(mockFetcher).toHaveBeenCalledWith('XYZ-789');
    });
  });

  describe('バリデーション', () => {
    it('idクエリパラメータが存在しない場合、HTTP 400エラーを返す', async () => {
      const mockFetcher = vi.fn();
      const controller = new MetadataController(mockFetcher);
      const { req, res, statusMock, jsonMock } = createMockExpressContext({});

      await controller.getMetadata(req, res);

      expect(mockFetcher).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing or invalid "id" parameter.' });
    });

    it('idクエリパラメータがstring型以外（配列等）の場合、HTTP 400エラーを返す', async () => {
      const mockFetcher = vi.fn();
      const controller = new MetadataController(mockFetcher);
      const { req, res, statusMock, jsonMock } = createMockExpressContext({ id: ['abc', 'def'] });

      await controller.getMetadata(req, res);

      expect(mockFetcher).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing or invalid "id" parameter.' });
    });

    it('idクエリパラメータが空文字の場合、HTTP 400エラーを返す', async () => {
      const mockFetcher = vi.fn();
      const controller = new MetadataController(mockFetcher);
      const { req, res, statusMock } = createMockExpressContext({ id: '' });

      await controller.getMetadata(req, res);

      expect(mockFetcher).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });

    it('idクエリパラメータが空白のみの場合、HTTP 400エラーを返し、fetcherは呼ばれずメトリクスが失敗として記録される', async () => {
      const mockFetcher = vi.fn();
      class TestRequestMetricsCollector extends NullMetricsCollector {
        public override recordRequest = vi.fn();
      }
      const mockMetricsCollector = new TestRequestMetricsCollector();
      const controller = new MetadataController(
        mockFetcher,
        undefined,
        undefined,
        undefined,
        mockMetricsCollector
      );
      const { req, res, statusMock, jsonMock } = createMockExpressContext({ id: '     ' });

      await controller.getMetadata(req, res);

      expect(mockFetcher).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing or invalid "id" parameter.' });
      expect(mockMetricsCollector.recordRequest).toHaveBeenCalledWith(expect.any(Number), false);
    });
  });

  describe('エラー系', () => {
    it('fetcherが404 Not Found ScraperErrorを投げた場合、HTTP 200で404エラー構造のJSONを返す', async () => {
      const notFoundError = new ScraperError('MissAV returned HTTP status 404.', {
        status: HTTP_STATUS.NOT_FOUND,
        debug: {
          finalUrl: 'https://missav.ai/ja/notfound-001',
          pageTitle: 'Not Found',
          htmlLength: 0,
          htmlPreview: '',
          bodyPreview: '',
          status: HTTP_STATUS.NOT_FOUND
        }
      });
      const mockFetcher = vi.fn().mockRejectedValue(notFoundError);
      const controller = new MetadataController(mockFetcher);
      const { req, res, statusMock, jsonMock } = createMockExpressContext({ id: 'notfound-001' });

      await controller.getMetadata(req, res);

      expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'MissAV returned HTTP status 404.',
          details: 'MissAV returned HTTP status 404.',
          status: HTTP_STATUS.NOT_FOUND,
          debug: expect.objectContaining({
            status: HTTP_STATUS.NOT_FOUND
          })
        })
      );
    });

    it('fetcherが500 Internal Server Error ScraperErrorを投げた場合、HTTP 200で500エラー構造のJSONを返す', async () => {
      const serverError = new ScraperError('Cloudflare blocked request (403 Forbidden).', {
        status: HTTP_STATUS.FORBIDDEN
      });
      const mockFetcher = vi.fn().mockRejectedValue(serverError);
      const controller = new MetadataController(mockFetcher);
      const { req, res, statusMock, jsonMock } = createMockExpressContext({ id: 'blocked-001' });

      await controller.getMetadata(req, res);

      expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Cloudflare blocked request (403 Forbidden).',
          status: HTTP_STATUS.FORBIDDEN
        })
      );
    });

    it('fetcherが通常のErrorオブジェクトを投げた場合、デフォルトの500エラー構造とdebugレスポンスを返す', async () => {
      const unexpectedError = new Error('Unexpected network failure');
      const mockFetcher = vi.fn().mockRejectedValue(unexpectedError);
      const controller = new MetadataController(mockFetcher);
      const { req, res, statusMock, jsonMock } = createMockExpressContext({ id: 'err-001' });

      await controller.getMetadata(req, res);

      expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unexpected network failure',
          details: 'Unexpected network failure',
          status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
          debug: expect.objectContaining({
            finalUrl: 'https://missav.ai/ja/err-001',
            pageTitle: 'Scraping Failed',
            status: HTTP_STATUS.INTERNAL_SERVER_ERROR
          })
        })
      );
    });
  });

  describe('DI (Dependency Injection)', () => {
    it('コンストラクタで IGetMetadataUseCase インスタンスが渡された場合、指定された UseCase を使用する', async () => {
      const mockUseCase = {
        execute: vi.fn().mockResolvedValue(mockScrapedMetadata),
      };
      const controller = new MetadataController(mockUseCase);
      const { req, res } = createMockExpressContext({ id: 'usecase-001' });

      await controller.getMetadata(req, res);

      expect(mockUseCase.execute).toHaveBeenCalledWith('USECASE-001');
    });

    it('コンストラクタでfetcherが渡された場合、指定されたfetcherを使用する', async () => {
      const customFetcher = vi.fn().mockResolvedValue(mockScrapedMetadata);
      const controller = new MetadataController(customFetcher);
      const { req, res } = createMockExpressContext({ id: 'custom-001' });

      await controller.getMetadata(req, res);

      expect(customFetcher).toHaveBeenCalledWith('CUSTOM-001');
    });

    it('カスタム ResponseFactory および ErrorResponseFactory を受け取り利用する', async () => {
      const mockFetcher = vi.fn().mockResolvedValue(mockScrapedMetadata);
      const customResponseFactory = {
        createSuccessResponse: vi.fn(),
        createMetadataResponse: vi.fn().mockReturnValue({ custom: 'metadata' }),
        createBadRequestResponse: vi.fn().mockReturnValue({ error: 'custom bad request' }),
      };
      const customErrorResponseFactory = {
        createErrorResponse: vi.fn(),
        create404ErrorResponse: vi.fn(),
        create500ErrorResponse: vi.fn(),
      };

      const controller = new MetadataController(
        mockFetcher,
        undefined,
        customResponseFactory,
        customErrorResponseFactory
      );
      const { req, res, statusMock, jsonMock } = createMockExpressContext({ id: 'di-001' });

      await controller.getMetadata(req, res);

      expect(customResponseFactory.createMetadataResponse).toHaveBeenCalledWith(mockScrapedMetadata);
      expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(jsonMock).toHaveBeenCalledWith({ custom: 'metadata' });
    });

    it('エラー時にカスタム ErrorResponseFactory が利用される', async () => {
      const mockError = new Error('Test Error');
      const mockFetcher = vi.fn().mockRejectedValue(mockError);
      const customErrorResponseFactory = {
        createErrorResponse: vi.fn().mockReturnValue({
          statusCode: 500,
          body: { error: 'Custom Error Body', details: 'Details', status: 500, debug: {} },
        }),
        create404ErrorResponse: vi.fn(),
        create500ErrorResponse: vi.fn(),
      };

      const controller = new MetadataController(
        mockFetcher,
        undefined,
        undefined,
        customErrorResponseFactory
      );
      const { req, res, statusMock, jsonMock } = createMockExpressContext({ id: 'di-err-001' });

      await controller.getMetadata(req, res);

      expect(customErrorResponseFactory.createErrorResponse).toHaveBeenCalledWith(mockError, 'DI-ERR-001');
      expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Custom Error Body' }));
    });
  });

  describe('キャッシュ管理 API (DELETE /api/cache & GET /api/cache/stats)', () => {
    it('clearCache: キャッシュアダプターの clear() が呼び出され、HTTP 200 を返すこと', async () => {
      const mockCache = {
        get: vi.fn(),
        set: vi.fn(),
        invalidate: vi.fn(),
        clear: vi.fn().mockResolvedValue(undefined),
      };
      const controller = new MetadataController(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        mockCache
      );
      const { req, res, statusMock, jsonMock } = createMockExpressContext({});

      await controller.clearCache(req, res);

      expect(mockCache.clear).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Cache cleared successfully',
        })
      );
    });

    it('clearCache: 保存失敗時は成功ではなくエラー応答を返すこと', async () => {
      const mockCache = {
        get: vi.fn(), set: vi.fn(), invalidate: vi.fn(),
        clear: vi.fn().mockRejectedValue(new Error('cache save failed')),
      };
      const controller = new MetadataController(
        undefined, undefined, undefined, undefined, undefined, mockCache
      );
      const { req, res, statusMock, jsonMock } = createMockExpressContext({});
      await controller.clearCache(req, res);
      expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(jsonMock).not.toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('clearCache: cacheAdapter が未設定でも安全に HTTP 200 を返すこと', async () => {
      const controller = new MetadataController();
      const { req, res, statusMock, jsonMock } = createMockExpressContext({});

      await controller.clearCache(req, res);

      expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Cache cleared successfully',
        })
      );
    });

    it('getCacheStats: キャッシュアダプターの getStats() が呼び出され、統計情報と HTTP 200 を返すこと', async () => {
      const mockCache = {
        get: vi.fn(),
        set: vi.fn(),
        invalidate: vi.fn(),
        clear: vi.fn(),
        getStats: vi.fn().mockResolvedValue({
          count: 42,
          maxEntries: 500,
          defaultTtlMs: 86400000,
          sizeBytes: 131480,
        }),
      };
      const controller = new MetadataController(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        mockCache
      );
      const { req, res, statusMock, jsonMock } = createMockExpressContext({});

      await controller.getCacheStats(req, res);

      expect(mockCache.getStats).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(jsonMock).toHaveBeenCalledWith({
        count: 42,
        maxEntries: 500,
        defaultTtlMs: 86400000,
        sizeBytes: 131480,
      });
    });

    it('getCacheStats: cacheAdapter が未設定の場合にデフォルト統計を返すこと', async () => {
      const controller = new MetadataController();
      const { req, res, statusMock, jsonMock } = createMockExpressContext({});

      await controller.getCacheStats(req, res);

      expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(jsonMock).toHaveBeenCalledWith({
        count: 0,
        maxEntries: 500,
        defaultTtlMs: 86400000,
        sizeBytes: 0,
      });
    });
  });
});

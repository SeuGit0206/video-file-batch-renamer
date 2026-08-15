import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SystemController } from '../src/controllers/SystemController';
import type { Request, Response } from 'express';
import type { ICacheAdapter } from '../src/cache';
import type { IProviderRegistry } from '../src/providers';
import { DefaultMetricsCollector, NullMetricsCollector } from '../src/metrics';
import type { ScrapedMetadata } from '../src/types';

const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      public models = {
        generateContent: mockGenerateContent,
      };
    },
  };
});

describe('SystemController Test Suite', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonFn: ReturnType<typeof vi.fn>;
  let statusFn: ReturnType<typeof vi.fn>;
  const originalEnvApiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    mockGenerateContent.mockReset();
    jsonFn = vi.fn().mockImplementation((val) => val);
    statusFn = vi.fn().mockReturnValue({ json: jsonFn });

    mockRequest = {};
    mockResponse = {
      status: statusFn as unknown as (code: number) => Response,
      json: jsonFn as unknown as (body: unknown) => Response,
    };
  });

  afterEach(() => {
    if (originalEnvApiKey !== undefined) {
      process.env.GEMINI_API_KEY = originalEnvApiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  });

  describe('GET /api/health', () => {
    it('正常系: キャッシュとプロバイダが健全な状態の時に status UP を返すこと', async () => {
      const mockCacheAdapter = {
        get: vi.fn().mockResolvedValue(null),
      } as unknown as ICacheAdapter<ScrapedMetadata>;

      const mockProviderRegistry = {
        getAllProviders: vi.fn().mockReturnValue([{ name: 'MissAV' }]),
      } as unknown as IProviderRegistry;

      const controller = new SystemController({
        cacheAdapter: mockCacheAdapter,
        providerRegistry: mockProviderRegistry,
        appVersion: '1.0.0',
      });

      await controller.getHealth(mockRequest as Request, mockResponse as Response);

      expect(statusFn).toHaveBeenCalledWith(200);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'UP',
          cache: 'OK',
          providers: ['MissAV'],
          version: '1.0.0',
        })
      );
      expect(mockCacheAdapter.get).toHaveBeenCalledWith('__HEALTH_CHECK__');
    });

    it('エラー系: キャッシュ接続エラー発生時に status DOWN / cache ERROR を返すこと', async () => {
      const mockCacheAdapter = {
        get: vi.fn().mockRejectedValue(new Error('Cache Connection Failed')),
      } as unknown as ICacheAdapter<ScrapedMetadata>;

      const controller = new SystemController({
        cacheAdapter: mockCacheAdapter,
      });

      await controller.getHealth(mockRequest as Request, mockResponse as Response);

      expect(statusFn).toHaveBeenCalledWith(200);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'DOWN',
          cache: 'ERROR',
        })
      );
    });

    it('例外系: 予期せぬエラー発生時に ErrorResponseFactory を通じてエラーステータスを返すこと', async () => {
      const mockResponseFactory = {
        createSuccessResponse: vi.fn().mockImplementation(() => {
          throw new Error('Serialization Fatal Error');
        }),
        createMetadataResponse: vi.fn(),
        createBadRequestResponse: vi.fn(),
      };

      const controller = new SystemController({
        responseFactory: mockResponseFactory,
      });

      await controller.getHealth(mockRequest as Request, mockResponse as Response);

      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Serialization Fatal Error',
        })
      );
    });
  });

  describe('GET /api/metrics', () => {
    it('正常系: MetricsCollector のスナップショット情報を返却すること', () => {
      const metricsCollector = new DefaultMetricsCollector();
      metricsCollector.recordRequest(150, true);
      metricsCollector.recordCacheHit();

      const controller = new SystemController({ metricsCollector });

      controller.getMetrics(mockRequest as Request, mockResponse as Response);

      expect(statusFn).toHaveBeenCalledWith(200);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          requests: expect.objectContaining({ total: 1, success: 1 }),
          cache: expect.objectContaining({ hits: 1 }),
        })
      );
    });

    it('例外系: metricsCollector が例外をスローした場合に 500 エラーレスポンスを返すこと', () => {
      class FailingMetricsCollector extends NullMetricsCollector {
        public override getSnapshot = vi.fn().mockImplementation(() => {
          throw new Error('Metrics storage corrupted');
        });
      }
      const failingMetricsCollector = new FailingMetricsCollector();

      const controller = new SystemController({ metricsCollector: failingMetricsCollector });

      controller.getMetrics(mockRequest as Request, mockResponse as Response);

      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Metrics storage corrupted',
        })
      );
    });
  });

  describe('GET /api/version', () => {
    it('正常系: バージョン、ビルド日時、アプリ名を返却すること', () => {
      const controller = new SystemController({
        appVersion: '1.2.3',
        appName: 'file-renamer-scraper',
        buildDate: '2026-07-30T00:00:00Z',
      });

      controller.getVersion(mockRequest as Request, mockResponse as Response);

      expect(statusFn).toHaveBeenCalledWith(200);
      expect(jsonFn).toHaveBeenCalledWith({
        version: '1.2.3',
        buildDate: '2026-07-30T00:00:00Z',
        name: 'file-renamer-scraper',
      });
    });

    it('例外系: 予期せぬエラー発生時に 500 エラーレスポンスを返すこと', () => {
      const mockResponseFactory = {
        createSuccessResponse: vi.fn().mockImplementation(() => {
          throw new Error('Version read failure');
        }),
        createMetadataResponse: vi.fn(),
        createBadRequestResponse: vi.fn(),
      };

      const controller = new SystemController({
        responseFactory: mockResponseFactory,
      });

      controller.getVersion(mockRequest as Request, mockResponse as Response);

      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Version read failure',
        })
      );
    });
  });

  describe('POST /api/test-gemini', () => {
    it('APIキーが指定されておらず環境変数も未設定の場合、HTTP 400 を返すこと', async () => {
      const controller = new SystemController();
      mockRequest.body = {};

      await controller.testGemini(mockRequest as Request, mockResponse as Response);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Gemini APIキーが設定されていません'),
        })
      );
    });

    it('APIキーが空白のみの場合、HTTP 400 を返すこと', async () => {
      const controller = new SystemController();
      mockRequest.body = { apiKey: '     ' };

      await controller.testGemini(mockRequest as Request, mockResponse as Response);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Gemini APIキーが設定されていません'),
        })
      );
    });

    it('APIキーが string 以外の場合、HTTP 400 を返すこと', async () => {
      const controller = new SystemController();
      mockRequest.body = { apiKey: 12345 };

      await controller.testGemini(mockRequest as Request, mockResponse as Response);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Gemini APIキーが設定されていません'),
        })
      );
    });

    it('有効なAPIキーで接続成功した場合、HTTP 200 と成功レスポンスを返すこと', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'Connection OK',
      });

      const controller = new SystemController();
      mockRequest.body = { apiKey: ' valid-gemini-key ' };

      await controller.testGemini(mockRequest as Request, mockResponse as Response);

      expect(statusFn).toHaveBeenCalledWith(200);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Gemini API 接続成功',
          status: 'ok',
        })
      );
    });

    it('Gemini API 呼び出し時にエラーが発生した場合、HTTP 200 で接続失敗レスポンスを返すこと', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API key not valid'));

      const controller = new SystemController();
      mockRequest.body = { apiKey: 'invalid-key' };

      await controller.testGemini(mockRequest as Request, mockResponse as Response);

      expect(statusFn).toHaveBeenCalledWith(200);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Gemini API 接続失敗'),
          details: 'API key not valid',
        })
      );
    });
  });
});

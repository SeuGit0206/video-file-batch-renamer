import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import {
  createMetadataRouter,
  createSystemRouter,
  createApiRouter
} from '../src/routes';
import { MetadataController, SystemController } from '../src/controllers';
import { ValidationMiddleware } from '../src/validation';
import type { ScrapedMetadata } from '../src/types';

interface RouteLayer {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack?: Array<{ handle: (req: Request, res: Response, next?: () => void) => void }>;
  };
}

describe('ApiRoutes Test Suite', () => {
  describe('createMetadataRouter', () => {
    it('デフォルト設定で Router が生成され、/metadata ルートが登録されること', () => {
      const router = createMetadataRouter();
      expect(router).toBeDefined();

      const routes = ((router.stack || []) as RouteLayer[]).map(layer => ({
        path: layer.route?.path,
        methods: layer.route?.methods,
      })).filter(r => r.path);

      expect(routes).toContainEqual(
        expect.objectContaining({
          path: '/metadata',
          methods: expect.objectContaining({ get: true }),
        })
      );
      expect(routes).toContainEqual(
        expect.objectContaining({
          path: '/cache',
          methods: expect.objectContaining({ delete: true }),
        })
      );
      expect(routes).toContainEqual(
        expect.objectContaining({
          path: '/cache/stats',
          methods: expect.objectContaining({ get: true }),
        })
      );
    });

    it('DI された MetadataController インスタンスが正しくハンドラーとして接続されること', async () => {
      const mockUseCase = {
        execute: vi.fn().mockResolvedValue({
          productId: 'TEST-123',
          title: 'Test Movie',
          actress: 'Test Actress',
          duration: '120 min',
          releaseDate: '2026-01-01',
          maker: 'Test Maker',
          series: 'Test Series',
          director: 'Test Director',
          label: 'Test Label',
          genres: ['Drama'],
          coverUrl: 'https://example.com/cover.jpg',
        } as ScrapedMetadata),
      };

      const controller = new MetadataController(mockUseCase);
      const router = createMetadataRouter(controller);
      expect(router).toBeDefined();

      const metadataLayer = ((router.stack || []) as RouteLayer[]).find(l => l.route?.path === '/metadata');
      expect(metadataLayer).toBeDefined();

      const req = { query: { id: 'TEST-123' } } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const routeHandlers = metadataLayer?.route?.stack || [];
      const finalHandler = routeHandlers[routeHandlers.length - 1]?.handle;
      expect(finalHandler).toBeDefined();

      await finalHandler?.(req, res);
      expect(mockUseCase.execute).toHaveBeenCalledWith('TEST-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });

    it('fetchAndParseMissAV 関数が渡された場合でも MetadataController が安全に初期化されること', () => {
      const mockFetcher = vi.fn().mockResolvedValue({
        productId: 'ABC-123',
        title: 'Test',
        actress: 'Test Actress',
        duration: '120 min',
        releaseDate: '2026-01-01',
        maker: 'Test Maker',
        series: 'Test Series',
        director: 'Test Director',
        label: 'Test Label',
        genres: ['Drama'],
        coverUrl: 'https://example.com/cover.jpg',
      } as ScrapedMetadata);
      const router = createMetadataRouter(mockFetcher);
      expect(router).toBeDefined();
    });

    it('カスタム ValidationMiddleware を受け取り適用できること', () => {
      const customValidator = new ValidationMiddleware();
      const router = createMetadataRouter(undefined, customValidator);
      expect(router).toBeDefined();
    });
  });

  describe('createSystemRouter', () => {
    it('デフォルト設定で Router が生成され、各システム監視ルートが登録されること', () => {
      const router = createSystemRouter();
      expect(router).toBeDefined();

      const routes = ((router.stack || []) as RouteLayer[]).map(layer => ({
        path: layer.route?.path,
        methods: layer.route?.methods,
      })).filter(r => r.path);

      expect(routes).toContainEqual(
        expect.objectContaining({
          path: '/health',
          methods: expect.objectContaining({ get: true }),
        })
      );
      expect(routes).toContainEqual(
        expect.objectContaining({
          path: '/metrics',
          methods: expect.objectContaining({ get: true }),
        })
      );
      expect(routes).toContainEqual(
        expect.objectContaining({
          path: '/version',
          methods: expect.objectContaining({ get: true }),
        })
      );
      expect(routes).toContainEqual(
        expect.objectContaining({
          path: '/test-gemini',
          methods: expect.objectContaining({ post: true }),
        })
      );
    });

    it('DI された SystemController のハンドラーが各ルートで呼び出されること', async () => {
      const systemController = new SystemController({
        appVersion: '2.0.0',
        appName: 'test-app',
      });

      const router = createSystemRouter(systemController);

      const req = { body: {} } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const layers = (router.stack || []) as RouteLayer[];

      const healthLayer = layers.find(l => l.route?.path === '/health');
      await healthLayer?.route?.stack?.[0]?.handle(req, res);
      expect(res.status).toHaveBeenCalledWith(200);

      const metricsLayer = layers.find(l => l.route?.path === '/metrics');
      await metricsLayer?.route?.stack?.[0]?.handle(req, res);
      expect(res.status).toHaveBeenCalledWith(200);

      const versionLayer = layers.find(l => l.route?.path === '/version');
      await versionLayer?.route?.stack?.[0]?.handle(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          version: '2.0.0',
          name: 'test-app',
        })
      );
    });
  });

  describe('createApiRouter', () => {
    it('ApiRouterDependencies なしでもデフォルトで統合 Router が生成されること', () => {
      const apiRouter = createApiRouter();
      expect(apiRouter).toBeDefined();
      expect(apiRouter.stack.length).toBeGreaterThanOrEqual(2);
    });

    it('ApiRouterDependencies で渡された各コントローラーがサブ Router に反映されること', () => {
      const mockMetadataController = new MetadataController();
      const mockSystemController = new SystemController();

      const apiRouter = createApiRouter({
        controller: mockMetadataController,
        systemController: mockSystemController,
      });

      expect(apiRouter).toBeDefined();
      expect(apiRouter.stack.length).toBe(2);
    });
  });
});

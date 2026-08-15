import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import packageJson from '../package.json';
import { CompositionRoot } from '../src/composition/CompositionRoot';
import { MetadataController, SystemController } from '../src/controllers';
import { CachingGetMetadataUseCase } from '../src/usecases';
import { ScrapingOrchestrator } from '../src/orchestrators';
import { LoggingService } from '../src/services';
import {
  BrowserLauncher,
  BrowserContextFactory,
  BrowserPageFactory,
  ResponseFactory,
  ErrorResponseFactory,
} from '../src/factories';
import { MetadataBuilder } from '../src/builders';
import { RetryPolicy } from '../src/policies';
import { StealthStrategy } from '../src/strategies';
import { DiagnosticsStorageService, CdpDiagnosticsService } from '../src/services';
import { LiteDbCacheAdapter } from '../src/cache';
import { DefaultMetricsCollector } from '../src/metrics';

describe('CompositionRoot', () => {
  beforeEach(() => {
    CompositionRoot.resetInstance();
  });

  it('getInstance がシングルトンインスタンスを返却する', () => {
    const instance1 = CompositionRoot.getInstance();
    const instance2 = CompositionRoot.getInstance();

    expect(instance1).toBeDefined();
    expect(instance1).toBe(instance2);
  });

  it('resetInstance 実行後に新しいインスタンスが生成される', () => {
    const instance1 = CompositionRoot.getInstance();
    CompositionRoot.resetInstance();
    const instance2 = CompositionRoot.getInstance();

    expect(instance1).not.toBe(instance2);
  });

  it('すべての主要コンポーネントおよびサービスが正しくインスタンス化・取得できる', () => {
    const root = CompositionRoot.getInstance();

    expect(root.getLoggingService()).toBe(LoggingService.getInstance());
    expect(root.getMetricsCollector()).toBeInstanceOf(DefaultMetricsCollector);
    expect(root.getEnvironmentProvider()).toBeDefined();
    expect(root.getRuntimeConfigurationProvider()).toBeDefined();
    expect(root.getFeatureFlagService()).toBeDefined();
    expect(root.getBrowserSettingsProvider()).toBeDefined();
    expect(root.getBrowserConfigFactory()).toBeDefined();

    expect(root.getBrowserLauncher()).toBeInstanceOf(BrowserLauncher);
    expect(root.getBrowserContextFactory()).toBeInstanceOf(BrowserContextFactory);
    expect(root.getBrowserPageFactory()).toBeInstanceOf(BrowserPageFactory);

    expect(root.getDiagnosticsStorageService()).toBeInstanceOf(DiagnosticsStorageService);
    expect(root.getCdpDiagnosticsService()).toBeInstanceOf(CdpDiagnosticsService);

    expect(root.getMetadataBuilder()).toBeInstanceOf(MetadataBuilder);
    expect(root.getRetryPolicy()).toBeInstanceOf(RetryPolicy);
    expect(root.getCircuitBreakerPolicy()).toBeDefined();
    expect(root.getRateLimiterPolicy()).toBeDefined();
    expect(root.getBulkheadPolicy()).toBeDefined();
    expect(root.getTimeoutPolicy()).toBeDefined();
    expect(root.getResiliencePolicy()).toBeDefined();
    expect(root.getStealthStrategy()).toBeInstanceOf(StealthStrategy);

    expect(root.getScrapingOrchestrator()).toBeInstanceOf(ScrapingOrchestrator);
    expect(root.getGetMetadataUseCase()).toBeInstanceOf(CachingGetMetadataUseCase);
    expect(root.getCacheAdapter()).toBeInstanceOf(LiteDbCacheAdapter);

    expect(root.getResponseFactory()).toBeInstanceOf(ResponseFactory);
    expect(root.getErrorResponseFactory()).toBeInstanceOf(ErrorResponseFactory);
    expect(root.getMetadataController()).toBeInstanceOf(MetadataController);
    expect(root.getSystemController()).toBeInstanceOf(SystemController);

    const jsonFn = vi.fn();
    const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
    const mockReq = {} as unknown as Request;
    const mockRes = { status: statusFn } as unknown as Response;

    root.getSystemController().getVersion(mockReq, mockRes);
    expect(statusFn).toHaveBeenCalledWith(200);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        version: packageJson.version,
      })
    );

    const apiRouter = root.getApiRouter();
    expect(apiRouter).toBeDefined();
    expect(apiRouter.stack.length).toBeGreaterThanOrEqual(2);
  });
});


import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ScrapingOrchestrator,
  type ScrapingOrchestratorDependencies
} from '../src/orchestrators/ScrapingOrchestrator';
import { CompositionRoot } from '../src/composition/CompositionRoot';
import { ProviderRegistry } from '../src/providers/ProviderRegistry';
import type { IScrapingProvider } from '../src/providers/IScrapingProvider';
import type { IScrapingStep } from '../src/steps/IScrapingStep';
import type { ILogger } from '../src/services';
import type { ScrapedMetadata } from '../src/types';
import { BrowserSettingsProvider } from '../src/browser/BrowserSettingsProvider';
import { BrowserConfigFactory } from '../src/browser/BrowserConfigFactory';
import { MetadataBuilder } from '../src/builders';
import { RetryPolicy } from '../src/policies';
import { StealthStrategy } from '../src/strategies';
import { DiagnosticsStorageService, CdpDiagnosticsService } from '../src/services';
import { NullMetricsCollector } from '../src/metrics/NullMetricsCollector';

describe('ScrapingOrchestrator DI & Refactoring Test Suite', () => {
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as unknown as ILogger;
  });

  describe('A. Dependencies オブジェクトによる生成', () => {
    it('完全な ScrapingOrchestratorDependencies を渡して正常にインスタンス化できること', async () => {
      const settingsProvider = new BrowserSettingsProvider();
      const configFactory = new BrowserConfigFactory({ settings: settingsProvider.getSettings() });
      const metadataBuilder = new MetadataBuilder();
      const retryPolicy = new RetryPolicy();
      const stealthStrategy = new StealthStrategy();
      const diagnosticsStorageService = new DiagnosticsStorageService(mockLogger);
      const cdpDiagnosticsService = new CdpDiagnosticsService(mockLogger, diagnosticsStorageService);
      const metricsCollector = new NullMetricsCollector();

      const step: IScrapingStep = {
        execute: async (ctx) => {
          ctx.metadata = {
            productId: ctx.cleanId,
            title: 'DI Test Title',
            actress: 'DI Actress',
            releaseDate: '2026-01-01',
            series: 'DI Series',
            maker: 'DI Maker'
          } as ScrapedMetadata;
        }
      };

      const deps: ScrapingOrchestratorDependencies = {
        customSteps: [step],
        logger: mockLogger,
        settingsProvider,
        configFactory,
        metadataBuilder,
        retryPolicy,
        stealthStrategy,
        diagnosticsStorageService,
        cdpDiagnosticsService,
        metricsCollector
      };

      const orchestrator = new ScrapingOrchestrator(deps);
      expect(orchestrator).toBeInstanceOf(ScrapingOrchestrator);

      const result = await orchestrator.fetch('di-001');
      expect(result.productId).toBe('DI-001');
      expect(result.title).toBe('DI Test Title');
    });

    it('空のオブジェクトまたは未指定でもデフォルトの依存関係で初期化されること', () => {
      const orchestrator1 = new ScrapingOrchestrator({});
      expect(orchestrator1).toBeInstanceOf(ScrapingOrchestrator);

      const orchestrator2 = new ScrapingOrchestrator();
      expect(orchestrator2).toBeInstanceOf(ScrapingOrchestrator);
    });

    it('部分的な依存関係のみ指定した場合も残りは適切にデフォルト補完されること', () => {
      const orchestrator = new ScrapingOrchestrator({ logger: mockLogger });
      expect(orchestrator).toBeInstanceOf(ScrapingOrchestrator);
    });
  });

  describe('B. CompositionRoot 統合', () => {
    it('CompositionRoot から ScrapingOrchestrator が正常に構築され取得できること', () => {
      CompositionRoot.resetInstance();
      const root = CompositionRoot.getInstance();
      const orchestrator = root.getScrapingOrchestrator();

      expect(orchestrator).toBeInstanceOf(ScrapingOrchestrator);
    });
  });

  describe('C. 既存 Scraping Pipeline & Provider 連携', () => {
    it('ProviderRegistry を注入したパイプラインが正しく動作すること', async () => {
      const registry = new ProviderRegistry();
      const executed: string[] = [];

      const mockStep: IScrapingStep = {
        execute: async (ctx) => {
          executed.push('step_executed');
          ctx.metadata = {
            productId: ctx.cleanId,
            title: 'Provider Pipe Title',
            actress: 'Provider Actress',
            releaseDate: '2026-02-02',
            series: 'Provider Series',
            maker: 'Provider Maker'
          } as ScrapedMetadata;
        }
      };

      const customProvider: IScrapingProvider = {
        name: 'CustomProvider',
        canHandle: (id: string) => id.toUpperCase().startsWith('CUST-'),
        createPipeline: () => [mockStep],
        getBaseUrl: () => 'https://custom-site.test'
      };
      registry.register(customProvider);

      const orchestrator = new ScrapingOrchestrator({
        providerRegistry: registry,
        logger: mockLogger
      });

      const result = await orchestrator.fetch('cust-999');
      expect(executed).toEqual(['step_executed']);
      expect(result.productId).toBe('CUST-999');
      expect(result.title).toBe('Provider Pipe Title');
    });

    it('静的メソッド fetchMissAVMetadata が logger を受け取り正常に実行できること', () => {
      expect(typeof ScrapingOrchestrator.fetchMissAVMetadata).toBe('function');
    });
  });

  describe('D. 後方互換性 (Legacy Constructor Support)', () => {
    it('IScrapingStep 配列を第1引数、logger を第2引数に渡すレガシー形式でも正常動作すること', async () => {
      const step: IScrapingStep = {
        execute: async (ctx) => {
          ctx.metadata = {
            productId: ctx.cleanId,
            title: 'Legacy Title',
            actress: 'Legacy Actress',
            releaseDate: '2026-03-03',
            series: 'Legacy Series',
            maker: 'Legacy Maker'
          } as ScrapedMetadata;
        }
      };

      // 旧形式: new ScrapingOrchestrator(steps, logger)
      const orchestrator = new ScrapingOrchestrator([step], mockLogger);
      const result = await orchestrator.fetch('leg-123');

      expect(result.productId).toBe('LEG-123');
      expect(result.title).toBe('Legacy Title');
    });

    it('ProviderRegistry を第1引数、logger を第2引数に渡すレガシー形式でも正常動作すること', async () => {
      const registry = new ProviderRegistry();
      const mockStep: IScrapingStep = {
        execute: async (ctx) => {
          ctx.metadata = {
            productId: ctx.cleanId,
            title: 'Legacy Registry Title',
            actress: 'Legacy Actress',
            releaseDate: '2026-04-04',
            series: 'Legacy Series',
            maker: 'Legacy Maker'
          } as ScrapedMetadata;
        }
      };

      const testProvider: IScrapingProvider = {
        name: 'TestLegacyProvider',
        canHandle: () => true,
        createPipeline: () => [mockStep],
        getBaseUrl: () => 'https://test.legacy'
      };
      registry.register(testProvider);

      // 旧形式: new ScrapingOrchestrator(registry, logger)
      const orchestrator = new ScrapingOrchestrator(registry, mockLogger);
      const result = await orchestrator.fetch('leg-456');

      expect(result.productId).toBe('LEG-456');
      expect(result.title).toBe('Legacy Registry Title');
    });
  });
});

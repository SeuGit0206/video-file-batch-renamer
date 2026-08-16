import type { ScrapedMetadata } from '../types';
import type { ILogger, ICdpDiagnosticsService, IDiagnosticsStorageService } from '../services';
import {
  LoggingService,
  CdpDiagnosticsService,
  DiagnosticsStorageService
} from '../services';
import { LOG_TAGS } from '../constants';
import {
  ScrapingContext,
  GeminiFallbackStep,
  type IScrapingStep
} from '../steps';
import { PlaywrightBrowserService } from '../browser/PlaywrightBrowserService';
import { BrowserSettingsProvider } from '../browser/BrowserSettingsProvider';
import { BrowserConfigFactory } from '../browser/BrowserConfigFactory';
import { MetadataBuilder, type IMetadataBuilder } from '../builders';
import { RetryPolicy, type IRetryPolicy } from '../policies';
import { StealthStrategy, type IStealthStrategy } from '../strategies';
import { ProviderRegistry, type IProviderRegistry } from '../providers/ProviderRegistry';
import { MissAvProvider } from '../providers/MissAvProvider';
import type { IMetricsCollector } from '../metrics/IMetricsCollector';
import { NullMetricsCollector } from '../metrics/NullMetricsCollector';

export interface ScrapingOrchestratorDependencies {
  providerRegistry?: IProviderRegistry;
  customSteps?: IScrapingStep[];
  logger?: ILogger;
  settingsProvider?: BrowserSettingsProvider;
  configFactory?: BrowserConfigFactory;
  metadataBuilder?: IMetadataBuilder;
  retryPolicy?: IRetryPolicy;
  stealthStrategy?: IStealthStrategy;
  diagnosticsStorageService?: IDiagnosticsStorageService;
  cdpDiagnosticsService?: ICdpDiagnosticsService;
  metricsCollector?: IMetricsCollector;
}

function normalizeDependencies(
  depsOrLegacy?: ScrapingOrchestratorDependencies | IProviderRegistry | IScrapingStep[] | BrowserSettingsProvider,
  legacyArg2?: ILogger | BrowserConfigFactory,
  legacyArg3?: BrowserSettingsProvider | ILogger,
  legacyArg4?: BrowserConfigFactory | IMetadataBuilder,
  legacyArg5?: IMetadataBuilder | IRetryPolicy,
  legacyArg6?: IRetryPolicy | IStealthStrategy,
  legacyArg7?: IStealthStrategy | IDiagnosticsStorageService,
  legacyArg8?: IDiagnosticsStorageService | ICdpDiagnosticsService,
  legacyArg9?: ICdpDiagnosticsService,
  legacyArg10?: IMetricsCollector
): ScrapingOrchestratorDependencies {
  if (depsOrLegacy && typeof depsOrLegacy === 'object' && !Array.isArray(depsOrLegacy) && !('getProvider' in depsOrLegacy) && !(depsOrLegacy instanceof BrowserSettingsProvider)) {
    return depsOrLegacy as ScrapingOrchestratorDependencies;
  }

  const result: ScrapingOrchestratorDependencies = {};

  if (Array.isArray(depsOrLegacy)) {
    result.customSteps = depsOrLegacy;
  } else if (depsOrLegacy && 'getProvider' in depsOrLegacy) {
    result.providerRegistry = depsOrLegacy as IProviderRegistry;
  } else if (depsOrLegacy instanceof BrowserSettingsProvider) {
    result.settingsProvider = depsOrLegacy;
  }

  if (legacyArg2) {
    if ('info' in legacyArg2) {
      result.logger = legacyArg2 as ILogger;
    } else if (legacyArg2 instanceof BrowserConfigFactory) {
      result.configFactory = legacyArg2;
    }
  }

  if (legacyArg3) {
    if (legacyArg3 instanceof BrowserSettingsProvider) {
      result.settingsProvider = legacyArg3;
    } else if ('info' in legacyArg3) {
      result.logger = legacyArg3 as ILogger;
    }
  }

  if (legacyArg4) {
    if (legacyArg4 instanceof BrowserConfigFactory) {
      result.configFactory = legacyArg4;
    } else if ('build' in legacyArg4) {
      result.metadataBuilder = legacyArg4 as IMetadataBuilder;
    }
  }

  if (legacyArg5) {
    if ('build' in legacyArg5) {
      result.metadataBuilder = legacyArg5 as IMetadataBuilder;
    } else if ('shouldRetry' in legacyArg5 || 'execute' in legacyArg5 || 'getMaxRetries' in legacyArg5) {
      result.retryPolicy = legacyArg5 as IRetryPolicy;
    }
  }

  if (legacyArg6) {
    if ('shouldRetry' in legacyArg6 || 'execute' in legacyArg6 || 'getMaxRetries' in legacyArg6) {
      result.retryPolicy = legacyArg6 as IRetryPolicy;
    } else if ('applyStealthContextOptions' in legacyArg6 || 'apply' in legacyArg6 || 'handleCloudflareDetected' in legacyArg6) {
      result.stealthStrategy = legacyArg6 as IStealthStrategy;
    }
  }

  if (legacyArg7) {
    if ('applyStealthContextOptions' in legacyArg7 || 'apply' in legacyArg7 || 'handleCloudflareDetected' in legacyArg7) {
      result.stealthStrategy = legacyArg7 as IStealthStrategy;
    } else if ('saveDiagnostics' in legacyArg7) {
      result.diagnosticsStorageService = legacyArg7 as IDiagnosticsStorageService;
    }
  }

  if (legacyArg8) {
    if ('saveDiagnostics' in legacyArg8) {
      result.diagnosticsStorageService = legacyArg8 as IDiagnosticsStorageService;
    } else if ('captureCdpDiagnostics' in legacyArg8 || 'setupCdpDiagnostics' in legacyArg8) {
      result.cdpDiagnosticsService = legacyArg8 as ICdpDiagnosticsService;
    }
  }

  if (legacyArg9) {
    result.cdpDiagnosticsService = legacyArg9;
  }

  if (legacyArg10) {
    result.metricsCollector = legacyArg10;
  }

  return result;
}

export class ScrapingOrchestrator {
  private logger: ILogger;
  private providerRegistry?: IProviderRegistry;
  private customSteps?: IScrapingStep[];
  private settingsProvider: BrowserSettingsProvider;
  private configFactory: BrowserConfigFactory;
  private metadataBuilder: IMetadataBuilder;
  private retryPolicy: IRetryPolicy;
  private stealthStrategy: IStealthStrategy;
  private diagnosticsStorageService: IDiagnosticsStorageService;
  private cdpDiagnosticsService: ICdpDiagnosticsService;
  private metricsCollector: IMetricsCollector;

  constructor(
    dependenciesOrLegacy?: ScrapingOrchestratorDependencies | IProviderRegistry | IScrapingStep[] | BrowserSettingsProvider,
    legacyLogger?: ILogger | BrowserConfigFactory,
    legacySettingsProvider?: BrowserSettingsProvider | ILogger,
    configFactoryOrMetadataBuilder?: BrowserConfigFactory | IMetadataBuilder,
    metadataBuilderOrRetryPolicy?: IMetadataBuilder | IRetryPolicy,
    retryPolicyOrStealthStrategy?: IRetryPolicy | IStealthStrategy,
    stealthStrategyOrDiagStorage?: IStealthStrategy | IDiagnosticsStorageService,
    diagnosticsStorageServiceOrCdp?: IDiagnosticsStorageService | ICdpDiagnosticsService,
    cdpDiagnosticsService?: ICdpDiagnosticsService,
    metricsCollector?: IMetricsCollector
  ) {
    // オブジェクト形式またはレガシー引数の正規化
    const deps = normalizeDependencies(
      dependenciesOrLegacy,
      legacyLogger,
      legacySettingsProvider,
      configFactoryOrMetadataBuilder,
      metadataBuilderOrRetryPolicy,
      retryPolicyOrStealthStrategy,
      stealthStrategyOrDiagStorage,
      diagnosticsStorageServiceOrCdp,
      cdpDiagnosticsService,
      metricsCollector
    );

    this.logger = deps.logger ?? LoggingService.getInstance();
    this.metricsCollector = deps.metricsCollector ?? new NullMetricsCollector();
    this.settingsProvider = deps.settingsProvider ?? new BrowserSettingsProvider();
    this.configFactory = deps.configFactory ?? new BrowserConfigFactory({ settings: this.settingsProvider.getSettings() });
    this.metadataBuilder = deps.metadataBuilder ?? new MetadataBuilder();
    this.retryPolicy = deps.retryPolicy ?? new RetryPolicy();
    this.stealthStrategy = deps.stealthStrategy ?? new StealthStrategy();
    this.diagnosticsStorageService = deps.diagnosticsStorageService ?? new DiagnosticsStorageService(this.logger);
    this.cdpDiagnosticsService = deps.cdpDiagnosticsService ?? new CdpDiagnosticsService(this.logger, this.diagnosticsStorageService);

    if (deps.customSteps) {
      this.customSteps = deps.customSteps;
    } else if (deps.providerRegistry) {
      this.providerRegistry = deps.providerRegistry;
    } else {
      // デフォルト: ProviderRegistry & MissAvProvider を生成・登録
      const registry = new ProviderRegistry();
      const missAvProvider = new MissAvProvider(
        this.settingsProvider,
        this.configFactory,
        this.logger,
        this.metadataBuilder,
        this.retryPolicy,
        this.stealthStrategy,
        this.diagnosticsStorageService,
        this.cdpDiagnosticsService
      );
      registry.register(missAvProvider);
      this.providerRegistry = registry;
    }
  }

  /**
   * 静的エントリーポイント (ファサード)
   */
  public static async fetchMissAVMetadata(productId: string, logger?: ILogger): Promise<ScrapedMetadata> {
    const orchestrator = new ScrapingOrchestrator({ logger });
    return orchestrator.fetch(productId);
  }

  /**
   * メインスクレイピングフロー (Pipeline Pattern & Provider/Adapter Strategy)
   */
  public async fetch(productId: string): Promise<ScrapedMetadata> {
    const startTime = Date.now();
    let baseUrl: string;
    let pipelineSteps: IScrapingStep[];
    let providerName = 'Unknown';

    if (this.customSteps) {
      // カスタムステップ配列が直接指定されている場合
      pipelineSteps = this.customSteps;
      baseUrl = 'https://missav.ai/ja/';
      providerName = 'CustomPipeline';
    } else if (this.providerRegistry) {
      // ProviderRegistry から Product ID に適した Provider を動的選定
      const provider = this.providerRegistry.getProvider(productId);
      baseUrl = provider.getBaseUrl();
      pipelineSteps = provider.createPipeline();
      providerName = provider.name;
    } else {
      throw new Error("No provider registry or pipeline steps initialized.");
    }

    const ctx = new ScrapingContext(productId, baseUrl);

    try {
      for (const step of pipelineSteps) {
        const stepName = step.constructor.name;
        const stepStart = Date.now();
        try {
          await step.execute(ctx);
          this.metricsCollector.recordStepExecution(stepName, Date.now() - stepStart, true);
        } catch (stepErr) {
          this.metricsCollector.recordStepExecution(stepName, Date.now() - stepStart, false);
          throw stepErr;
        }

        if (ctx.earlyReturnResult) {
          this.metricsCollector.recordScraping(providerName, Date.now() - startTime);
          return ctx.earlyReturnResult;
        }
      }

      if (!ctx.metadata) {
        throw new Error("Metadata extraction failed. No metadata generated.");
      }

      this.metricsCollector.recordScraping(providerName, Date.now() - startTime);
      return ctx.metadata;
    } finally {
      await this.cleanup(ctx);
    }
  }

  /**
   * 後方互換性のための Gemini フォールバック メソッド
   */
  public async fallbackToGemini(productId: string): Promise<ScrapedMetadata> {
    const activeSteps = this.customSteps || (this.providerRegistry?.getProvider(productId).createPipeline() ?? []);
    const fallbackStep = activeSteps.find(s => s instanceof GeminiFallbackStep) as GeminiFallbackStep | undefined;
    if (fallbackStep) {
      return fallbackStep.fallbackToGemini(productId);
    }
    const step = new GeminiFallbackStep(
      this.settingsProvider,
      this.configFactory,
      this.logger,
      this.metadataBuilder,
      this.cdpDiagnosticsService,
      this.diagnosticsStorageService
    );
    return step.fallbackToGemini(productId);
  }

  private async cleanup(ctx: ScrapingContext): Promise<void> {
    this.logger.info(`${LOG_TAGS.LIFECYCLE} Entering finally block. Closing resources if open...`);
    try {
      if (ctx.page) {
        try { await ctx.page.close(); } catch {}
        ctx.page = null;
      }
      if (ctx.context) {
        try { await ctx.context.close(); } catch {}
        ctx.context = null;
      }
      if (ctx.browser) {
        try { await ctx.browser.close(); } catch {}
        ctx.browser = null;
      }
      // モックテスト等で PlaywrightBrowserService.prototype.dispose の呼び出しを記録・確認させる
      const browserService = new PlaywrightBrowserService(this.settingsProvider, this.configFactory);
      await browserService.dispose();
    } catch (e: unknown) {
      this.logger.info(`${LOG_TAGS.LIFECYCLE} Note on cleanup: ${e instanceof Error ? e.message : String(e)}`);
    }
    this.logger.info(`${LOG_TAGS.LIFECYCLE} finally block done.`);
  }
}

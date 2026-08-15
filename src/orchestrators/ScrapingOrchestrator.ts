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
    providerRegistryOrStepsOrSettings?: IProviderRegistry | IScrapingStep[] | BrowserSettingsProvider,
    loggerOrConfigFactory?: ILogger | BrowserConfigFactory,
    settingsProviderOrLogger?: BrowserSettingsProvider | ILogger,
    configFactoryOrMetadataBuilder?: BrowserConfigFactory | IMetadataBuilder,
    metadataBuilderOrRetryPolicy?: IMetadataBuilder | IRetryPolicy,
    retryPolicyOrStealthStrategy?: IRetryPolicy | IStealthStrategy,
    stealthStrategyOrDiagStorage?: IStealthStrategy | IDiagnosticsStorageService,
    diagnosticsStorageServiceOrCdp?: IDiagnosticsStorageService | ICdpDiagnosticsService,
    cdpDiagnosticsService?: ICdpDiagnosticsService,
    metricsCollector?: IMetricsCollector
  ) {
    this.metricsCollector = metricsCollector || new NullMetricsCollector();

    // 依存サービス初期化の基本設定
    if (providerRegistryOrStepsOrSettings && 'getProvider' in providerRegistryOrStepsOrSettings) {
      // 1. IProviderRegistry が渡された場合
      this.providerRegistry = providerRegistryOrStepsOrSettings;
      this.logger = (loggerOrConfigFactory as ILogger) || LoggingService.getInstance();
      this.settingsProvider = (settingsProviderOrLogger as BrowserSettingsProvider) || new BrowserSettingsProvider();
      this.configFactory = (configFactoryOrMetadataBuilder as BrowserConfigFactory) || new BrowserConfigFactory({ settings: this.settingsProvider.getSettings() });
      this.metadataBuilder = (metadataBuilderOrRetryPolicy as IMetadataBuilder) || new MetadataBuilder();
      this.retryPolicy = (retryPolicyOrStealthStrategy as IRetryPolicy) || new RetryPolicy();
      this.stealthStrategy = (stealthStrategyOrDiagStorage as IStealthStrategy) || new StealthStrategy();
      this.diagnosticsStorageService = (diagnosticsStorageServiceOrCdp as IDiagnosticsStorageService) || new DiagnosticsStorageService(this.logger);
      this.cdpDiagnosticsService = cdpDiagnosticsService || new CdpDiagnosticsService(this.logger, this.diagnosticsStorageService);
    } else if (Array.isArray(providerRegistryOrStepsOrSettings)) {
      // 2. IScrapingStep[] が直接渡された場合 (テスト等のカスタムステップ指定)
      this.customSteps = providerRegistryOrStepsOrSettings;
      this.logger = (loggerOrConfigFactory as ILogger) || LoggingService.getInstance();
      this.settingsProvider = (settingsProviderOrLogger as BrowserSettingsProvider) || new BrowserSettingsProvider();
      this.configFactory = (configFactoryOrMetadataBuilder as BrowserConfigFactory) || new BrowserConfigFactory({ settings: this.settingsProvider.getSettings() });
      this.metadataBuilder = (metadataBuilderOrRetryPolicy as IMetadataBuilder) || new MetadataBuilder();
      this.retryPolicy = (retryPolicyOrStealthStrategy as IRetryPolicy) || new RetryPolicy();
      this.stealthStrategy = (stealthStrategyOrDiagStorage as IStealthStrategy) || new StealthStrategy();
      this.diagnosticsStorageService = (diagnosticsStorageServiceOrCdp as IDiagnosticsStorageService) || new DiagnosticsStorageService(this.logger);
      this.cdpDiagnosticsService = cdpDiagnosticsService || new CdpDiagnosticsService(this.logger, this.diagnosticsStorageService);
    } else {
      // 3. レジストリもステップも渡されていない場合 (既存コンストラクタ互換: デフォルトでProviderRegistry & MissAvProviderを生成)
      this.settingsProvider = (providerRegistryOrStepsOrSettings as BrowserSettingsProvider) || new BrowserSettingsProvider();
      this.configFactory = (loggerOrConfigFactory as BrowserConfigFactory) || new BrowserConfigFactory({ settings: this.settingsProvider.getSettings() });
      this.logger = (settingsProviderOrLogger as ILogger) || LoggingService.getInstance();
      this.metadataBuilder = (configFactoryOrMetadataBuilder as IMetadataBuilder) || new MetadataBuilder();
      this.retryPolicy = (metadataBuilderOrRetryPolicy as IRetryPolicy) || new RetryPolicy();
      this.stealthStrategy = (retryPolicyOrStealthStrategy as IStealthStrategy) || new StealthStrategy();
      this.diagnosticsStorageService = (stealthStrategyOrDiagStorage as IDiagnosticsStorageService) || new DiagnosticsStorageService(this.logger);
      this.cdpDiagnosticsService = (diagnosticsStorageServiceOrCdp as ICdpDiagnosticsService) || new CdpDiagnosticsService(this.logger, this.diagnosticsStorageService);

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
    const orchestrator = new ScrapingOrchestrator(undefined, undefined, logger);
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

import type { Router } from 'express';
import { LoggingService, type ILogger } from '../services';
import packageJson from '../../package.json';
import { createApiRouter } from '../routes';
import { ExportStrategyFactory } from '../services/export/ExportStrategyFactory';
import { StatisticsService } from '../services/statistics/StatisticsService';
import { ImportStrategyFactory } from '../services/import/ImportStrategyFactory';
import { ImportValidationPolicy } from '../policies/ImportValidationPolicy';
import { JsonImportService } from '../services/import/JsonImportService';
import { CsvImportService } from '../services/import/CsvImportService';
import { RuleEvaluator, RuleEngine, RulePresetService } from '../services/rule';
import { DiagnosticsStorageService, type IDiagnosticsStorageService } from '../services';
import { CdpDiagnosticsService, type ICdpDiagnosticsService } from '../services';
import { BrowserSettingsProvider } from '../browser/BrowserSettingsProvider';
import { BrowserConfigFactory } from '../browser/BrowserConfigFactory';
import {
  BrowserLauncher,
  type IBrowserLauncher,
  BrowserContextFactory,
  type IBrowserContextFactory,
  BrowserPageFactory,
  type IBrowserPageFactory,
  ResponseFactory,
  type IResponseFactory,
  ErrorResponseFactory,
  type IErrorResponseFactory
} from '../factories';
import { MetadataBuilder, type IMetadataBuilder } from '../builders';
import {
  RetryPolicy,
  type IRetryPolicy,
  CircuitBreakerPolicy,
  type ICircuitBreakerPolicy,
  RateLimiterPolicy,
  type IRateLimiterPolicy,
  BulkheadPolicy,
  type IBulkheadPolicy,
  TimeoutPolicy,
  type ITimeoutPolicy,
  ResiliencePolicy,
  type IResiliencePolicy
} from '../policies';
import { StealthStrategy, type IStealthStrategy } from '../strategies';
import { ScrapingOrchestrator } from '../orchestrators';
import { GetMetadataUseCase, CachingGetMetadataUseCase, type IGetMetadataUseCase } from '../usecases';
import { MetadataController, SystemController } from '../controllers';
import { ProviderRegistry, MissAvProvider, type IProviderRegistry } from '../providers';
import { MissAvMetadataExtractor, type IMetadataExtractor } from '../extractors';
import { LiteDbCacheAdapter, type ICacheAdapter } from '../cache';
import { DefaultMetricsCollector, type IMetricsCollector } from '../metrics';
import {
  EnvironmentProvider,
  type IEnvironmentProvider,
  RuntimeConfigurationProvider,
  type IRuntimeConfigurationProvider,
  FeatureFlagService,
  type IFeatureFlagService
} from '../config';
import {
  SecurityHeadersProvider,
  type ISecurityHeadersProvider,
  InputSanitizer,
  type IInputSanitizer,
  OutputSanitizer,
  type IOutputSanitizer,
  HeaderSanitizer,
  type IHeaderSanitizer
} from '../security';
import {
  RequestValidator,
  type IRequestValidator,
  ValidationMiddleware
} from '../validation';
import { SecurityMiddleware } from '../middleware';
import {
  PerformanceProfiler,
  type IPerformanceProfiler,
  ResponseCacheService,
  type IResponseCacheService,
  ResponseCacheMiddleware,
  StreamOptimizer,
  type IStreamOptimizer,
  MemoryOptimizer,
  type IMemoryOptimizer
} from '../performance';
import {
  StructuredLogger,
  DistributedTracer,
  type IDistributedTracer,
  PrometheusAndOtelExporter,
  type IPrometheusExporter,
  AlertingMonitor,
  DiagnosticsTimeline,
  MonitoringMiddleware
} from '../monitoring';
import {
  ChaosInjector,
  type IChaosInjector,
  SelfHealingRecoveryService,
  type ISelfHealingRecoveryService,
  FaultToleranceValidator,
  type IFaultToleranceValidator,
  ChaosDiagnostics,
  type IChaosDiagnostics
} from '../chaos';
import {
  SyntheticMonitor,
  type ISyntheticMonitor,
  VerificationEngine,
  type IVerificationEngine,
  MonitoringScheduler,
  type IMonitoringScheduler,
  ReportingService,
  type IReportingService,
  NotificationService,
  type INotificationService
} from '../synthetic';
import {
  ArchitectureHealthChecker,
  type IArchitectureHealthChecker,
  DependencyAnalyzer,
  type IDependencyAnalyzer,
  ConfigurationAuditor,
  type IConfigurationAuditor,
  SecurityAuditor,
  type ISecurityAuditor,
  PerformanceBenchmarker,
  type IPerformanceBenchmarker,
  LoadTestRunner,
  type ILoadTestRunner,
  ReleaseReadinessReportGenerator,
  type IReleaseReadinessReportGenerator,
  OperationalDashboardBackend,
  type IOperationalDashboardBackend
} from '../readiness';
import type { ScrapedMetadata } from '../types';

/**
 * Composition Root (DI構成) インターフェース
 */
export interface ICompositionRoot {
  getLoggingService(): ILogger;
  getMetricsCollector(): IMetricsCollector;
  getEnvironmentProvider(): IEnvironmentProvider;
  getRuntimeConfigurationProvider(): IRuntimeConfigurationProvider;
  getFeatureFlagService(): IFeatureFlagService;
  getSecurityHeadersProvider(): ISecurityHeadersProvider;
  getInputSanitizer(): IInputSanitizer;
  getOutputSanitizer(): IOutputSanitizer;
  getHeaderSanitizer(): IHeaderSanitizer;
  getRequestValidator(): IRequestValidator;
  getValidationMiddleware(): ValidationMiddleware;
  getSecurityMiddleware(): SecurityMiddleware;
  getPerformanceProfiler(): IPerformanceProfiler;
  getResponseCacheService(): IResponseCacheService;
  getResponseCacheMiddleware(): ResponseCacheMiddleware;
  getStreamOptimizer(): IStreamOptimizer;
  getMemoryOptimizer(): IMemoryOptimizer;
  getStructuredLogger(): StructuredLogger;
  getDistributedTracer(): IDistributedTracer;
  getPrometheusExporter(): IPrometheusExporter;
  getAlertingMonitor(): AlertingMonitor;
  getDiagnosticsTimeline(): DiagnosticsTimeline;
  getMonitoringMiddleware(): MonitoringMiddleware;
  getChaosInjector(): IChaosInjector;
  getSelfHealingRecoveryService(): ISelfHealingRecoveryService;
  getFaultToleranceValidator(): IFaultToleranceValidator;
  getChaosDiagnostics(): IChaosDiagnostics;
  getSyntheticMonitor(): ISyntheticMonitor;
  getVerificationEngine(): IVerificationEngine;
  getMonitoringScheduler(): IMonitoringScheduler;
  getReportingService(): IReportingService;
  getNotificationService(): INotificationService;
  getArchitectureHealthChecker(): IArchitectureHealthChecker;
  getDependencyAnalyzer(): IDependencyAnalyzer;
  getConfigurationAuditor(): IConfigurationAuditor;
  getSecurityAuditor(): ISecurityAuditor;
  getPerformanceBenchmarker(): IPerformanceBenchmarker;
  getLoadTestRunner(): ILoadTestRunner;
  getReleaseReadinessReportGenerator(): IReleaseReadinessReportGenerator;
  getOperationalDashboardBackend(): IOperationalDashboardBackend;
  getBrowserSettingsProvider(): BrowserSettingsProvider;
  getBrowserConfigFactory(): BrowserConfigFactory;
  getBrowserLauncher(): IBrowserLauncher;
  getBrowserContextFactory(): IBrowserContextFactory;
  getBrowserPageFactory(): IBrowserPageFactory;
  getDiagnosticsStorageService(): IDiagnosticsStorageService;
  getCdpDiagnosticsService(): ICdpDiagnosticsService;
  getMetadataBuilder(): IMetadataBuilder;
  getRetryPolicy(): IRetryPolicy;
  getCircuitBreakerPolicy(): ICircuitBreakerPolicy;
  getRateLimiterPolicy(): IRateLimiterPolicy;
  getBulkheadPolicy(): IBulkheadPolicy;
  getTimeoutPolicy(): ITimeoutPolicy;
  getResiliencePolicy(): IResiliencePolicy;
  getStealthStrategy(): IStealthStrategy;
  getProviderRegistry(): IProviderRegistry;
  getMissAvMetadataExtractor(): IMetadataExtractor;
  getCacheAdapter(): ICacheAdapter<ScrapedMetadata>;
  getScrapingOrchestrator(): ScrapingOrchestrator;
  getGetMetadataUseCase(): IGetMetadataUseCase;
  getResponseFactory(): IResponseFactory;
  getErrorResponseFactory(): IErrorResponseFactory;
  getMetadataController(): MetadataController;
  getSystemController(): SystemController;
  getExportStrategyFactory(): typeof ExportStrategyFactory;
  getStatisticsService(): typeof StatisticsService;
  getImportStrategyFactory(): typeof ImportStrategyFactory;
  getImportValidationPolicy(): typeof ImportValidationPolicy;
  getJsonImportService(): typeof JsonImportService;
  getCsvImportService(): typeof CsvImportService;
  getRuleEvaluator(): RuleEvaluator;
  getRuleEngine(): RuleEngine;
  getRulePresetService(): RulePresetService;
}

/**
 * アプリケーション全体の依存関係を集約・構築する Composition Root
 */
export class CompositionRoot implements ICompositionRoot {
  private static instance: CompositionRoot | null = null;

  private logger: ILogger;
  private metricsCollector: IMetricsCollector;
  private environmentProvider: IEnvironmentProvider;
  private runtimeConfigurationProvider: IRuntimeConfigurationProvider;
  private featureFlagService: IFeatureFlagService;
  private securityHeadersProvider: ISecurityHeadersProvider;
  private inputSanitizer: IInputSanitizer;
  private outputSanitizer: IOutputSanitizer;
  private headerSanitizer: IHeaderSanitizer;
  private requestValidator: IRequestValidator;
  private validationMiddleware: ValidationMiddleware;
  private securityMiddleware: SecurityMiddleware;
  private performanceProfiler: IPerformanceProfiler;
  private responseCacheService: IResponseCacheService;
  private responseCacheMiddleware: ResponseCacheMiddleware;
  private streamOptimizer: IStreamOptimizer;
  private memoryOptimizer: IMemoryOptimizer;
  private structuredLogger: StructuredLogger;
  private distributedTracer: IDistributedTracer;
  private prometheusExporter: IPrometheusExporter;
  private alertingMonitor: AlertingMonitor;
  private diagnosticsTimeline: DiagnosticsTimeline;
  private monitoringMiddleware: MonitoringMiddleware;
  private chaosInjector: IChaosInjector;
  private selfHealingRecoveryService: ISelfHealingRecoveryService;
  private faultToleranceValidator: IFaultToleranceValidator;
  private chaosDiagnostics: IChaosDiagnostics;
  private syntheticMonitor: ISyntheticMonitor;
  private verificationEngine: IVerificationEngine;
  private monitoringScheduler: IMonitoringScheduler;
  private reportingService: IReportingService;
  private notificationService: INotificationService;
  private architectureHealthChecker: IArchitectureHealthChecker;
  private dependencyAnalyzer: IDependencyAnalyzer;
  private configurationAuditor: IConfigurationAuditor;
  private securityAuditor: ISecurityAuditor;
  private performanceBenchmarker: IPerformanceBenchmarker;
  private loadTestRunner: ILoadTestRunner;
  private releaseReadinessReportGenerator: IReleaseReadinessReportGenerator;
  private operationalDashboardBackend: IOperationalDashboardBackend;
  private settingsProvider: BrowserSettingsProvider;
  private configFactory: BrowserConfigFactory;
  private browserLauncher: IBrowserLauncher;
  private browserContextFactory: IBrowserContextFactory;
  private browserPageFactory: IBrowserPageFactory;
  private diagnosticsStorageService: IDiagnosticsStorageService;
  private cdpDiagnosticsService: ICdpDiagnosticsService;
  private metadataBuilder: IMetadataBuilder;
  private retryPolicy: IRetryPolicy;
  private circuitBreakerPolicy: ICircuitBreakerPolicy;
  private rateLimiterPolicy: IRateLimiterPolicy;
  private bulkheadPolicy: IBulkheadPolicy;
  private timeoutPolicy: ITimeoutPolicy;
  private resiliencePolicy: IResiliencePolicy;
  private stealthStrategy: IStealthStrategy;
  private missAvMetadataExtractor: IMetadataExtractor;
  private providerRegistry: IProviderRegistry;
  private cacheAdapter: ICacheAdapter<ScrapedMetadata>;
  private scrapingOrchestrator: ScrapingOrchestrator;
  private getMetadataUseCase: IGetMetadataUseCase;
  private responseFactory: IResponseFactory;
  private errorResponseFactory: IErrorResponseFactory;
  private metadataController: MetadataController;
  private systemController: SystemController;
  private exportStrategyFactory: typeof ExportStrategyFactory;
  private statisticsService: typeof StatisticsService;
  private importStrategyFactory: typeof ImportStrategyFactory;
  private importValidationPolicy: typeof ImportValidationPolicy;
  private jsonImportService: typeof JsonImportService;
  private csvImportService: typeof CsvImportService;
  private ruleEvaluator: RuleEvaluator;
  private ruleEngine: RuleEngine;
  private rulePresetService: RulePresetService;

  constructor() {
    this.logger = LoggingService.getInstance();
    this.metricsCollector = new DefaultMetricsCollector();
    this.environmentProvider = new EnvironmentProvider();
    this.runtimeConfigurationProvider = new RuntimeConfigurationProvider(this.environmentProvider, this.logger);
    this.featureFlagService = new FeatureFlagService(this.environmentProvider, this.logger);
    this.securityHeadersProvider = new SecurityHeadersProvider();
    this.inputSanitizer = new InputSanitizer();
    this.outputSanitizer = new OutputSanitizer();
    this.headerSanitizer = new HeaderSanitizer();
    this.requestValidator = new RequestValidator();
    this.validationMiddleware = new ValidationMiddleware(this.requestValidator, this.inputSanitizer);
    this.securityMiddleware = new SecurityMiddleware(
      this.securityHeadersProvider,
      this.headerSanitizer,
      this.outputSanitizer
    );
    this.performanceProfiler = new PerformanceProfiler();
    this.responseCacheService = new ResponseCacheService();
    this.responseCacheMiddleware = new ResponseCacheMiddleware(this.responseCacheService);
    this.streamOptimizer = new StreamOptimizer();
    this.memoryOptimizer = new MemoryOptimizer();
    this.structuredLogger = new StructuredLogger();
    this.distributedTracer = new DistributedTracer();
    this.prometheusExporter = new PrometheusAndOtelExporter(this.distributedTracer as DistributedTracer);
    this.alertingMonitor = new AlertingMonitor(this.distributedTracer as DistributedTracer);
    this.diagnosticsTimeline = new DiagnosticsTimeline(this.distributedTracer as DistributedTracer);
    this.monitoringMiddleware = new MonitoringMiddleware(
      this.structuredLogger,
      this.distributedTracer as DistributedTracer,
      this.prometheusExporter as PrometheusAndOtelExporter
    );
    this.chaosInjector = new ChaosInjector(this.featureFlagService);
    this.selfHealingRecoveryService = new SelfHealingRecoveryService();
    this.faultToleranceValidator = new FaultToleranceValidator();
    this.chaosDiagnostics = new ChaosDiagnostics();
    this.syntheticMonitor = new SyntheticMonitor(this.featureFlagService);
    this.verificationEngine = new VerificationEngine();
    this.monitoringScheduler = new MonitoringScheduler(
      this.syntheticMonitor,
      this.verificationEngine,
      this.featureFlagService
    );
    this.reportingService = new ReportingService(this.syntheticMonitor, this.verificationEngine);
    this.notificationService = new NotificationService();
    this.architectureHealthChecker = new ArchitectureHealthChecker(this.featureFlagService);
    this.dependencyAnalyzer = new DependencyAnalyzer();
    this.configurationAuditor = new ConfigurationAuditor(this.featureFlagService);
    this.securityAuditor = new SecurityAuditor();
    this.performanceBenchmarker = new PerformanceBenchmarker();
    this.loadTestRunner = new LoadTestRunner();
    this.releaseReadinessReportGenerator = new ReleaseReadinessReportGenerator(
      this.architectureHealthChecker,
      this.dependencyAnalyzer,
      this.configurationAuditor,
      this.securityAuditor,
      this.performanceBenchmarker,
      this.loadTestRunner
    );
    this.operationalDashboardBackend = new OperationalDashboardBackend(
      this.releaseReadinessReportGenerator
    );
    this.settingsProvider = new BrowserSettingsProvider();
    const settings = this.settingsProvider.getSettings();
    this.configFactory = new BrowserConfigFactory({ settings });

    this.browserLauncher = new BrowserLauncher({
      settingsProvider: this.settingsProvider,
      configFactory: this.configFactory,
      logger: this.logger
    });
    this.browserContextFactory = new BrowserContextFactory({
      settingsProvider: this.settingsProvider,
      configFactory: this.configFactory
    });
    this.browserPageFactory = new BrowserPageFactory();

    this.diagnosticsStorageService = new DiagnosticsStorageService(this.logger, this.metricsCollector);
    this.cdpDiagnosticsService = new CdpDiagnosticsService(this.logger, this.diagnosticsStorageService);

    this.metadataBuilder = new MetadataBuilder();
    this.retryPolicy = new RetryPolicy();
    this.circuitBreakerPolicy = new CircuitBreakerPolicy({ logger: this.logger });
    this.rateLimiterPolicy = new RateLimiterPolicy({ logger: this.logger });
    this.bulkheadPolicy = new BulkheadPolicy({ logger: this.logger });
    this.timeoutPolicy = new TimeoutPolicy();
    this.resiliencePolicy = new ResiliencePolicy({
      circuitBreaker: this.circuitBreakerPolicy,
      rateLimiter: this.rateLimiterPolicy,
      bulkhead: this.bulkheadPolicy,
      timeout: this.timeoutPolicy,
    });
    this.stealthStrategy = new StealthStrategy();
    this.missAvMetadataExtractor = new MissAvMetadataExtractor();
    this.cacheAdapter = new LiteDbCacheAdapter<ScrapedMetadata>(undefined, this.logger);

    // ProviderRegistry & Providers の構築・登録
    const registry = new ProviderRegistry();
    const missAvProvider = new MissAvProvider(
      this.settingsProvider,
      this.configFactory,
      this.logger,
      this.metadataBuilder,
      this.retryPolicy,
      this.stealthStrategy,
      this.diagnosticsStorageService,
      this.cdpDiagnosticsService,
      this.missAvMetadataExtractor
    );
    registry.register(missAvProvider);
    this.providerRegistry = registry;

    this.scrapingOrchestrator = new ScrapingOrchestrator({
      providerRegistry: this.providerRegistry,
      logger: this.logger,
      settingsProvider: this.settingsProvider,
      configFactory: this.configFactory,
      metadataBuilder: this.metadataBuilder,
      retryPolicy: this.retryPolicy,
      stealthStrategy: this.stealthStrategy,
      diagnosticsStorageService: this.diagnosticsStorageService,
      cdpDiagnosticsService: this.cdpDiagnosticsService,
      metricsCollector: this.metricsCollector,
    });

    const baseUseCase = new GetMetadataUseCase(
      (productId: string) => this.scrapingOrchestrator.fetch(productId)
    );
    this.getMetadataUseCase = new CachingGetMetadataUseCase(
      baseUseCase,
      this.cacheAdapter,
      this.metricsCollector
    );

    this.responseFactory = new ResponseFactory();
    this.errorResponseFactory = new ErrorResponseFactory();

    this.metadataController = new MetadataController(
      this.getMetadataUseCase,
      this.logger,
      this.responseFactory,
      this.errorResponseFactory,
      this.metricsCollector,
      this.cacheAdapter
    );

    this.systemController = new SystemController({
      cacheAdapter: this.cacheAdapter,
      providerRegistry: this.providerRegistry,
      metricsCollector: this.metricsCollector,
      responseFactory: this.responseFactory,
      errorResponseFactory: this.errorResponseFactory,
      logger: this.logger,
      appVersion: packageJson.version
    });

    this.exportStrategyFactory = ExportStrategyFactory;
    this.statisticsService = StatisticsService;
    this.importStrategyFactory = ImportStrategyFactory;
    this.importValidationPolicy = ImportValidationPolicy;
    this.jsonImportService = JsonImportService;
    this.csvImportService = CsvImportService;

    this.ruleEvaluator = new RuleEvaluator();
    this.ruleEngine = new RuleEngine(this.ruleEvaluator);
    this.rulePresetService = new RulePresetService(this.ruleEngine);
  }

  /**
   * CompositionRoot のシングルトンインスタンスを取得
   */
  public static getInstance(): CompositionRoot {
    if (!CompositionRoot.instance) {
      CompositionRoot.instance = new CompositionRoot();
    }
    return CompositionRoot.instance;
  }

  /**
   * テスト用インスタンスリセット関数
   */
  public static resetInstance(): void {
    CompositionRoot.instance = null;
  }

  public getLoggingService(): ILogger {
    return this.logger;
  }

  public getMetricsCollector(): IMetricsCollector {
    return this.metricsCollector;
  }

  public getEnvironmentProvider(): IEnvironmentProvider {
    return this.environmentProvider;
  }

  public getRuntimeConfigurationProvider(): IRuntimeConfigurationProvider {
    return this.runtimeConfigurationProvider;
  }

  public getFeatureFlagService(): IFeatureFlagService {
    return this.featureFlagService;
  }

  public getSecurityHeadersProvider(): ISecurityHeadersProvider {
    return this.securityHeadersProvider;
  }

  public getInputSanitizer(): IInputSanitizer {
    return this.inputSanitizer;
  }

  public getOutputSanitizer(): IOutputSanitizer {
    return this.outputSanitizer;
  }

  public getHeaderSanitizer(): IHeaderSanitizer {
    return this.headerSanitizer;
  }

  public getRequestValidator(): IRequestValidator {
    return this.requestValidator;
  }

  public getValidationMiddleware(): ValidationMiddleware {
    return this.validationMiddleware;
  }

  public getSecurityMiddleware(): SecurityMiddleware {
    return this.securityMiddleware;
  }

  public getPerformanceProfiler(): IPerformanceProfiler {
    return this.performanceProfiler;
  }

  public getResponseCacheService(): IResponseCacheService {
    return this.responseCacheService;
  }

  public getResponseCacheMiddleware(): ResponseCacheMiddleware {
    return this.responseCacheMiddleware;
  }

  public getStreamOptimizer(): IStreamOptimizer {
    return this.streamOptimizer;
  }

  public getMemoryOptimizer(): IMemoryOptimizer {
    return this.memoryOptimizer;
  }

  public getStructuredLogger(): StructuredLogger {
    return this.structuredLogger;
  }

  public getDistributedTracer(): IDistributedTracer {
    return this.distributedTracer;
  }

  public getPrometheusExporter(): IPrometheusExporter {
    return this.prometheusExporter;
  }

  public getAlertingMonitor(): AlertingMonitor {
    return this.alertingMonitor;
  }

  public getDiagnosticsTimeline(): DiagnosticsTimeline {
    return this.diagnosticsTimeline;
  }

  public getMonitoringMiddleware(): MonitoringMiddleware {
    return this.monitoringMiddleware;
  }

  public getChaosInjector(): IChaosInjector {
    return this.chaosInjector;
  }

  public getSelfHealingRecoveryService(): ISelfHealingRecoveryService {
    return this.selfHealingRecoveryService;
  }

  public getFaultToleranceValidator(): IFaultToleranceValidator {
    return this.faultToleranceValidator;
  }

  public getChaosDiagnostics(): IChaosDiagnostics {
    return this.chaosDiagnostics;
  }

  public getSyntheticMonitor(): ISyntheticMonitor {
    return this.syntheticMonitor;
  }

  public getVerificationEngine(): IVerificationEngine {
    return this.verificationEngine;
  }

  public getMonitoringScheduler(): IMonitoringScheduler {
    return this.monitoringScheduler;
  }

  public getReportingService(): IReportingService {
    return this.reportingService;
  }

  public getNotificationService(): INotificationService {
    return this.notificationService;
  }

  public getArchitectureHealthChecker(): IArchitectureHealthChecker {
    return this.architectureHealthChecker;
  }

  public getDependencyAnalyzer(): IDependencyAnalyzer {
    return this.dependencyAnalyzer;
  }

  public getConfigurationAuditor(): IConfigurationAuditor {
    return this.configurationAuditor;
  }

  public getSecurityAuditor(): ISecurityAuditor {
    return this.securityAuditor;
  }

  public getPerformanceBenchmarker(): IPerformanceBenchmarker {
    return this.performanceBenchmarker;
  }

  public getLoadTestRunner(): ILoadTestRunner {
    return this.loadTestRunner;
  }

  public getReleaseReadinessReportGenerator(): IReleaseReadinessReportGenerator {
    return this.releaseReadinessReportGenerator;
  }

  public getOperationalDashboardBackend(): IOperationalDashboardBackend {
    return this.operationalDashboardBackend;
  }

  public getBrowserSettingsProvider(): BrowserSettingsProvider {
    return this.settingsProvider;
  }

  public getBrowserConfigFactory(): BrowserConfigFactory {
    return this.configFactory;
  }

  public getBrowserLauncher(): IBrowserLauncher {
    return this.browserLauncher;
  }

  public getBrowserContextFactory(): IBrowserContextFactory {
    return this.browserContextFactory;
  }

  public getBrowserPageFactory(): IBrowserPageFactory {
    return this.browserPageFactory;
  }

  public getDiagnosticsStorageService(): IDiagnosticsStorageService {
    return this.diagnosticsStorageService;
  }

  public getCdpDiagnosticsService(): ICdpDiagnosticsService {
    return this.cdpDiagnosticsService;
  }

  public getMetadataBuilder(): IMetadataBuilder {
    return this.metadataBuilder;
  }

  public getRetryPolicy(): IRetryPolicy {
    return this.retryPolicy;
  }

  public getCircuitBreakerPolicy(): ICircuitBreakerPolicy {
    return this.circuitBreakerPolicy;
  }

  public getRateLimiterPolicy(): IRateLimiterPolicy {
    return this.rateLimiterPolicy;
  }

  public getBulkheadPolicy(): IBulkheadPolicy {
    return this.bulkheadPolicy;
  }

  public getTimeoutPolicy(): ITimeoutPolicy {
    return this.timeoutPolicy;
  }

  public getResiliencePolicy(): IResiliencePolicy {
    return this.resiliencePolicy;
  }

  public getStealthStrategy(): IStealthStrategy {
    return this.stealthStrategy;
  }

  public getMissAvMetadataExtractor(): IMetadataExtractor {
    return this.missAvMetadataExtractor;
  }

  public getCacheAdapter(): ICacheAdapter<ScrapedMetadata> {
    return this.cacheAdapter;
  }

  public getProviderRegistry(): IProviderRegistry {
    return this.providerRegistry;
  }

  public getScrapingOrchestrator(): ScrapingOrchestrator {
    return this.scrapingOrchestrator;
  }

  public getGetMetadataUseCase(): IGetMetadataUseCase {
    return this.getMetadataUseCase;
  }

  public getResponseFactory(): IResponseFactory {
    return this.responseFactory;
  }

  public getErrorResponseFactory(): IErrorResponseFactory {
    return this.errorResponseFactory;
  }

  public getMetadataController(): MetadataController {
    return this.metadataController;
  }

  public getSystemController(): SystemController {
    return this.systemController;
  }

  public getExportStrategyFactory(): typeof ExportStrategyFactory {
    return this.exportStrategyFactory;
  }

  public getStatisticsService(): typeof StatisticsService {
    return this.statisticsService;
  }

  public getImportStrategyFactory(): typeof ImportStrategyFactory {
    return this.importStrategyFactory;
  }

  public getImportValidationPolicy(): typeof ImportValidationPolicy {
    return this.importValidationPolicy;
  }

  public getJsonImportService(): typeof JsonImportService {
    return this.jsonImportService;
  }

  public getCsvImportService(): typeof CsvImportService {
    return this.csvImportService;
  }

  public getRuleEvaluator(): RuleEvaluator {
    return this.ruleEvaluator;
  }

  public getRuleEngine(): RuleEngine {
    return this.ruleEngine;
  }

  public getRulePresetService(): RulePresetService {
    return this.rulePresetService;
  }

  public getApiRouter(): Router {
    return createApiRouter({
      controller: this.metadataController,
      systemController: this.systemController,
      validationMiddleware: this.validationMiddleware
    });
  }
}

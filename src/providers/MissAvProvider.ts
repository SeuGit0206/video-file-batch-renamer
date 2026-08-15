import type { IScrapingProvider } from './IScrapingProvider';
import type { IScrapingStep } from '../steps/IScrapingStep';
import {
  OpenProductPageStep,
  CloudflareDetectionStep,
  HtmlExtractionStep,
  GeminiFallbackStep,
  MetadataParsingStep,
  DiagnosticsStep
} from '../steps';
import type { BrowserSettingsProvider } from '../browser/BrowserSettingsProvider';
import type { BrowserConfigFactory } from '../browser/BrowserConfigFactory';
import type { IMetadataBuilder } from '../builders';
import type { IRetryPolicy } from '../policies';
import type { IStealthStrategy } from '../strategies';
import type { ILogger, ICdpDiagnosticsService, IDiagnosticsStorageService } from '../services';
import type { IMetadataExtractor } from '../extractors/IMetadataExtractor';
import { MissAvMetadataExtractor } from '../extractors/MissAvMetadataExtractor';
import { MISSAV_JA_BASE_URL } from '../constants';

export class MissAvProvider implements IScrapingProvider {
  public readonly name = 'MissAV';

  constructor(
    private settingsProvider: BrowserSettingsProvider,
    private configFactory: BrowserConfigFactory,
    private logger: ILogger,
    private metadataBuilder: IMetadataBuilder,
    private retryPolicy: IRetryPolicy,
    private stealthStrategy: IStealthStrategy,
    private diagnosticsStorageService: IDiagnosticsStorageService,
    private cdpDiagnosticsService: ICdpDiagnosticsService,
    private extractor: IMetadataExtractor = new MissAvMetadataExtractor()
  ) {}

  public canHandle(productId: string): boolean {
    if (typeof productId !== 'string' || !productId.trim()) {
      return false;
    }
    // 現在の既定プロバイダーとして全ての有効なID要求に対応（MissAV固有キーワードの判定拡張も可能）
    return true;
  }

  public getBaseUrl(): string {
    return MISSAV_JA_BASE_URL;
  }

  public createPipeline(): IScrapingStep[] {
    const openStep = new OpenProductPageStep(
      this.settingsProvider,
      this.configFactory,
      this.logger,
      this.cdpDiagnosticsService,
      this.diagnosticsStorageService
    );
    const cfStep = new CloudflareDetectionStep(
      this.settingsProvider,
      this.configFactory,
      this.logger,
      this.retryPolicy,
      this.stealthStrategy,
      this.cdpDiagnosticsService,
      this.diagnosticsStorageService
    );
    const extractionStep = new HtmlExtractionStep(this.logger);
    const fallbackStep = new GeminiFallbackStep(
      this.settingsProvider,
      this.configFactory,
      this.logger,
      this.metadataBuilder,
      this.cdpDiagnosticsService,
      this.diagnosticsStorageService
    );
    const parseStep = new MetadataParsingStep(this.logger, this.metadataBuilder, this.extractor);
    const diagStep = new DiagnosticsStep(this.logger);

    return [
      openStep,
      cfStep,
      extractionStep,
      fallbackStep,
      parseStep,
      diagStep
    ];
  }
}

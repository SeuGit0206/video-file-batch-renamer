import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MissAvProvider } from '../src/providers/MissAvProvider';
import { BrowserSettingsProvider } from '../src/browser/BrowserSettingsProvider';
import { BrowserConfigFactory } from '../src/browser/BrowserConfigFactory';
import { MetadataBuilder } from '../src/builders/MetadataBuilder';
import { RetryPolicy } from '../src/policies/RetryPolicy';
import { StealthStrategy } from '../src/strategies/StealthStrategy';
import type { ILogger, ICdpDiagnosticsService, IDiagnosticsStorageService } from '../src/services';

describe('MissAvProvider Test Suite', () => {
  let provider: MissAvProvider;
  let mockLogger: ILogger;
  let settingsProvider: BrowserSettingsProvider;
  let configFactory: BrowserConfigFactory;
  let metadataBuilder: MetadataBuilder;
  let retryPolicy: RetryPolicy;
  let stealthStrategy: StealthStrategy;
  let mockDiagStorage: IDiagnosticsStorageService;
  let mockCdpDiag: ICdpDiagnosticsService;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as unknown as ILogger;

    settingsProvider = new BrowserSettingsProvider();
    configFactory = new BrowserConfigFactory({ settings: settingsProvider.getSettings() });
    metadataBuilder = new MetadataBuilder();
    retryPolicy = new RetryPolicy();
    stealthStrategy = new StealthStrategy();

    mockDiagStorage = {
      runAndSaveFingerprint: vi.fn(),
      runAndSaveHTML: vi.fn()
    } as unknown as IDiagnosticsStorageService;

    mockCdpDiag = {
      setupCDPTracking: vi.fn()
    } as unknown as ICdpDiagnosticsService;

    provider = new MissAvProvider(
      settingsProvider,
      configFactory,
      mockLogger,
      metadataBuilder,
      retryPolicy,
      stealthStrategy,
      mockDiagStorage,
      mockCdpDiag
    );
  });

  it('プロバイダー名が MissAV であること', () => {
    expect(provider.name).toBe('MissAV');
  });

  it('任意の Product ID に対して canHandle が true を返すこと', () => {
    expect(provider.canHandle('ssis-001')).toBe(true);
    expect(provider.canHandle('abc-123')).toBe(true);
  });

  it('空文字や空白のみの Product ID の場合は canHandle が false を返すこと', () => {
    expect(provider.canHandle('')).toBe(false);
    expect(provider.canHandle('   ')).toBe(false);
    expect(provider.canHandle(null as unknown as string)).toBe(false);
    expect(provider.canHandle(undefined as unknown as string)).toBe(false);
  });

  it('正しいベースURLを返すこと', () => {
    expect(provider.getBaseUrl()).toBe('https://missav.ai/ja');
  });

  it('createPipeline が 6 つの MissAV 用スクレイピングステップを返すこと', () => {
    const steps = provider.createPipeline();
    expect(steps).toBeDefined();
    expect(steps.length).toBe(6);
  });
});

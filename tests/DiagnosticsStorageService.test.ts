import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiagnosticsStorageService } from '../src/services/DiagnosticsStorageService';
import fs from 'fs';
import type { Page } from 'playwright';
import type { ILogger } from '../src/services';
import type { IMetricsCollector } from '../src/metrics/IMetricsCollector';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof fs>('fs');
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn().mockReturnValue(false),
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
    },
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

describe('DiagnosticsStorageService', () => {
  let service: DiagnosticsStorageService;
  let logger: ILogger;
  let metricsCollector: IMetricsCollector;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
    logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as ILogger;
    metricsCollector = {
      recordCdpLogSaved: vi.fn(),
      recordHtmlSaved: vi.fn(),
    } as unknown as IMetricsCollector;
    service = new DiagnosticsStorageService(logger, metricsCollector);
  });

  it('ensureDiagnosticsDir が必要なディレクトリを作成する', () => {
    service.ensureDiagnosticsDir();
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('html'),
      { recursive: true }
    );
  });

  it('savePlaywrightDiff が diff 情報を JSON 保存する', () => {
    const opts = { userAgent: 'CustomUA', viewport: { width: 1920, height: 1080 } };
    service.savePlaywrightDiff(opts, true);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('playwright-options-diff.json'),
      expect.stringContaining('"userAgent": "CustomUA"'),
      'utf-8'
    );
  });

  it('savePageComparison がページ比較データを保存する', () => {
    const page403 = { status: 403, title: 'Blocked', htmlLen: 100, cookiesCount: 2 };
    const page200 = { status: 200, title: 'Success', htmlLen: 500, cookiesCount: 5 };

    service.savePageComparison(page403, page200);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('page-comparison.json'),
      expect.stringContaining('"sizeDelta": 400'),
      'utf-8'
    );
  });

  it('saveCDPLog が CDP イベントログを保存する', () => {
    const events = [{ event: 'Network.requestWillBeSent', args: [], timestamp: 123456 }];
    service.saveCDPLog('test-suffix', events);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('cdp-test-suffix.json'),
      expect.stringContaining('Network.requestWillBeSent'),
      'utf-8'
    );
  });

  it('saveHtmlLog が HTML コンテンツを保存する', () => {
    service.saveHtmlLog('page-123', 'test', 'inner body', 'outer doc', 'page content');

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('page-123-body-inner-test.html'),
      'inner body',
      'utf-8'
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('page-123-doc-outer-test.html'),
      'outer doc',
      'utf-8'
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('page-123-page-content-test.html'),
      'page content',
      'utf-8'
    );
  });

  it('診断ファイルの書き込み失敗を記録し、呼び出し元へ例外を出さない', () => {
    vi.mocked(fs.writeFileSync).mockImplementation(() => {
      throw new Error('診断ファイルを書き込めません');
    });

    expect(() => service.saveCDPLog('failed', [{ event: 'request' }])).not.toThrow();

    expect(logger.error).toHaveBeenCalledWith('CDP saving failed:', '診断ファイルを書き込めません');
    expect(metricsCollector.recordCdpLogSaved).not.toHaveBeenCalled();
  });

  it('HTML取得失敗を記録し、保存データを作らず安全に終了する', async () => {
    const page = {
      evaluate: vi.fn().mockResolvedValue('<html></html>'),
      content: vi.fn().mockRejectedValue(new Error('HTMLを取得できません')),
    } as unknown as Page;

    await expect(service.runAndSaveHTML(page, 'failed', 'ABC-123')).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith('HTML collection failed:', 'HTMLを取得できません');
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(metricsCollector.recordHtmlSaved).not.toHaveBeenCalled();
  });

  it('比較対象が不足している場合は比較ファイルを作らず安全に終了する', () => {
    const page403 = { status: 403, title: 'Blocked', htmlLen: 100, cookiesCount: 2 };
    const page200 = { status: 200, title: 'Success', htmlLen: 500, cookiesCount: 5 };

    expect(() => {
      service.savePageComparison(page403, null);
      service.savePageComparison(null, page200);
      service.savePageComparison(null, null);
    }).not.toThrow();

    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('診断ディレクトリ作成失敗を記録し、呼び出し元へ例外を出さない', () => {
    vi.mocked(fs.mkdirSync).mockImplementation(() => {
      throw new Error('診断ディレクトリを作成できません');
    });

    expect(() => service.ensureDiagnosticsDir()).not.toThrow();

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to ensure diagnostics directories:',
      '診断ディレクトリを作成できません'
    );
  });
});

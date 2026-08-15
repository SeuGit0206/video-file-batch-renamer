import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiagnosticsStorageService } from '../src/services/DiagnosticsStorageService';
import fs from 'fs';

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

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DiagnosticsStorageService();
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
});

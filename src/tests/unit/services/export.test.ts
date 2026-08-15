import { describe, expect, it } from 'vitest';
import { CsvExportService } from '../../../services/export/CsvExportService';
import { ExportStrategyFactory } from '../../../services/export/ExportStrategyFactory';
import { HtmlExportService } from '../../../services/export/HtmlExportService';
import { JsonExportService } from '../../../services/export/JsonExportService';
import type { ExportData, ExportFormat } from '../../../types/export';

describe('CsvExportService', () => {
  const exportService = new CsvExportService();

  it('正しいフォーマット名と対応ターゲットを返す', () => {
    expect(exportService.format).toBe('csv');
    expect(exportService.supportsTarget('history')).toBe(true);
    expect(exportService.supportsTarget('metadata')).toBe(true);
    expect(exportService.supportsTarget('logs')).toBe(true);
    expect(exportService.supportsTarget('statistics')).toBe(true);
    expect(exportService.supportsTarget('settings')).toBe(false);
  });

  it('正常なデータからヘッダー付きのCSVを生成する', async () => {
    const data: ExportData = {
      title: 'test_export',
      exportedAt: new Date().toISOString(),
      items: [
        { id: 1, name: 'Video 1', status: 'success' },
        { id: 2, name: 'Video 2', status: 'failed' },
      ],
    };

    const result = await exportService.exportData(data);

    expect(result.success).toBe(true);
    expect(result.format).toBe('csv');
    expect(result.filename).toContain('test_export');
    expect(result.mimeType).toBe('text/csv;charset=utf-8;');
    expect(result.blob).toBeInstanceOf(Blob);

    const content = result.content;
    expect(content).toBeDefined();
    // UTF-8 BOM check
    expect(content?.startsWith('\uFEFF')).toBe(true);
    expect(content).toContain('"id","name","status"');
    expect(content).toContain('"1","Video 1","success"');
    expect(content).toContain('"2","Video 2","failed"');
  });

  it('カンマ、改行、ダブルクォートを適切にエスケープする', async () => {
    const data: ExportData = {
      exportedAt: new Date().toISOString(),
      items: [
        {
          title: 'Title with, comma',
          note: 'Line 1\nLine 2',
          quote: 'Said "Hello"',
        },
      ],
    };

    const result = await exportService.exportData(data);
    expect(result.success).toBe(true);

    const content = result.content || '';
    expect(content).toContain('"Title with, comma"');
    expect(content).toContain('"Line 1\nLine 2"');
    expect(content).toContain('"Said ""Hello"""');
  });

  it('CSV Formula Injection対策を行なう', async () => {
    const data: ExportData = {
      exportedAt: new Date().toISOString(),
      items: [
        { formula1: '=SUM(1,2)', formula2: '+cmd', formula3: '-1+1', formula4: '@eval' },
      ],
    };

    const result = await exportService.exportData(data);
    expect(result.success).toBe(true);

    const content = result.content || '';
    expect(content).toContain("'\u003dSUM(1,2)"); // '=SUM(1,2) escaped
    expect(content).toContain("'+cmd");
    expect(content).toContain("'-1+1");
    expect(content).toContain("'@eval");
  });

  it('sanitizeOutput: false の場合は Formula Injection 対策をスキップする', async () => {
    const data: ExportData = {
      exportedAt: new Date().toISOString(),
      items: [{ formula: '=1+1' }],
    };

    const result = await exportService.exportData(data, { sanitizeOutput: false });
    expect(result.success).toBe(true);
    expect(result.content).toContain('"=1+1"');
  });

  it('日本語文字および特殊文字を正しく取り扱う', async () => {
    const data: ExportData = {
      title: '動画一覧',
      exportedAt: new Date().toISOString(),
      items: [
        { id: '001', title: '日本語タイトル_動画A.mp4', tags: 'アニメ, 4K' },
      ],
    };

    const result = await exportService.exportData(data);
    expect(result.success).toBe(true);
    expect(result.content).toContain('日本語タイトル_動画A.mp4');
    expect(result.content).toContain('アニメ, 4K');
  });

  it('空のデータ配列を正しく処理する', async () => {
    const data: ExportData = {
      title: 'empty',
      exportedAt: new Date().toISOString(),
      items: [],
    };

    const result = await exportService.exportData(data);
    expect(result.success).toBe(true);
    expect(result.content).toBe('\uFEFF');
    expect(result.sizeBytes).toBeGreaterThan(0);
  });
});

describe('JsonExportService', () => {
  const jsonService = new JsonExportService();

  it('正しいフォーマット名と対応ターゲットを返す', () => {
    expect(jsonService.format).toBe('json');
    expect(jsonService.supportsTarget('history')).toBe(true);
    expect(jsonService.supportsTarget('metadata')).toBe(true);
    expect(jsonService.supportsTarget('logs')).toBe(true);
    expect(jsonService.supportsTarget('settings')).toBe(true);
    expect(jsonService.supportsTarget('statistics')).toBe(true);
  });

  it('正常なデータからインデント整形されたJSONを生成する', async () => {
    const data: ExportData = {
      title: 'json_test_export',
      exportedAt: '2026-08-04T00:00:00.000Z',
      items: [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ],
      metadata: { author: 'Admin' },
    };

    const result = await jsonService.exportData(data);

    expect(result.success).toBe(true);
    expect(result.format).toBe('json');
    expect(result.filename).toContain('json_test_export');
    expect(result.mimeType).toBe('application/json;charset=utf-8;');
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.sizeBytes).toBeGreaterThan(0);

    const parsed = JSON.parse(result.content || '{}');
    expect(parsed.title).toBe('json_test_export');
    expect(parsed.itemsCount).toBe(2);
    expect(parsed.items).toHaveLength(2);
    expect(parsed.metadata.author).toBe('Admin');

    // Pretty print (2 space indent) check
    expect(result.content).toContain('  "title": "json_test_export"');
  });

  it('日本語および特殊文字を正しく取り扱う', async () => {
    const data: ExportData = {
      title: '動画ログ',
      exportedAt: new Date().toISOString(),
      items: [
        { name: '日本語ファイル名_1080p.mp4', status: '成功' },
      ],
    };

    const result = await jsonService.exportData(data);
    expect(result.success).toBe(true);

    const parsed = JSON.parse(result.content || '{}');
    expect(parsed.items[0].name).toBe('日本語ファイル名_1080p.mp4');
    expect(parsed.items[0].status).toBe('成功');
  });

  it('空のデータ配列を正しく処理する', async () => {
    const data: ExportData = {
      title: 'empty_json',
      exportedAt: new Date().toISOString(),
      items: [],
    };

    const result = await jsonService.exportData(data);
    expect(result.success).toBe(true);

    const parsed = JSON.parse(result.content || '{}');
    expect(parsed.itemsCount).toBe(0);
    expect(parsed.items).toEqual([]);
  });

  it('循環参照を含むオブジェクトを安全に描画する', async () => {
    const circularObj: Record<string, unknown> = { name: 'Circular Test' };
    circularObj.self = circularObj;

    const data: ExportData = {
      title: 'circular_test',
      exportedAt: new Date().toISOString(),
      items: [circularObj],
    };

    const result = await jsonService.exportData(data);
    expect(result.success).toBe(true);

    const content = result.content || '';
    expect(content).toContain('[Circular]');
  });
});

describe('HtmlExportService', () => {
  const htmlService = new HtmlExportService();

  it('正しいフォーマット名と対応ターゲットを返す', () => {
    expect(htmlService.format).toBe('html');
    expect(htmlService.supportsTarget('history')).toBe(true);
    expect(htmlService.supportsTarget('metadata')).toBe(true);
    expect(htmlService.supportsTarget('logs')).toBe(true);
    expect(htmlService.supportsTarget('statistics')).toBe(true);
    expect(htmlService.supportsTarget('settings')).toBe(false);
  });

  it('正常なデータからHTMLレポートを生成する', async () => {
    const data: ExportData = {
      title: 'html_test_report',
      exportedAt: '2026-08-04T00:00:00.000Z',
      items: [
        { id: 1, name: 'File A.mp4', status: 'Success' },
        { id: 2, name: 'File B.mp4', status: 'Failed' },
      ],
    };

    const result = await htmlService.exportData(data);

    expect(result.success).toBe(true);
    expect(result.format).toBe('html');
    expect(result.filename).toContain('html_test_report');
    expect(result.mimeType).toBe('text/html;charset=utf-8;');
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.sizeBytes).toBeGreaterThan(0);

    const content = result.content || '';
    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('<h1>html_test_report</h1>');
    expect(content).toContain('<strong>総件数:</strong> 2 件');
    expect(content).toContain('>id</th>');
    expect(content).toContain('>File A.mp4</td>');
  });

  it('HTML特殊文字を安全にエスケープする (XSS対策)', async () => {
    const data: ExportData = {
      title: 'XSS <script>alert(1)</script> Test',
      exportedAt: new Date().toISOString(),
      items: [
        { script: '<script>alert("xss")</script>', link: '<a href="http://test.com">test</a>', quotes: '"&\'<' },
      ],
    };

    const result = await htmlService.exportData(data);
    expect(result.success).toBe(true);

    const content = result.content || '';
    expect(content).not.toContain('<script>');
    expect(content).toContain('&lt;script&gt;');
    expect(content).toContain('&quot;&amp;&#39;&lt;');
  });

  it('日本語データを正しく取り扱う', async () => {
    const data: ExportData = {
      title: '動画一覧レポート',
      exportedAt: new Date().toISOString(),
      items: [
        { name: '日本語テスト動画.mp4', status: '完了' },
      ],
    };

    const result = await htmlService.exportData(data);
    expect(result.success).toBe(true);

    const content = result.content || '';
    expect(content).toContain('動画一覧レポート');
    expect(content).toContain('日本語テスト動画.mp4');
    expect(content).toContain('完了');
  });

  it('空のデータ配列を正しく処理する', async () => {
    const data: ExportData = {
      title: 'empty_report',
      exportedAt: new Date().toISOString(),
      items: [],
    };

    const result = await htmlService.exportData(data);
    expect(result.success).toBe(true);

    const content = result.content || '';
    expect(content).toContain('<strong>総件数:</strong> 0 件');
  });
});

describe('ExportStrategyFactory', () => {
  it('csv フォーマット時に CsvExportService を返す', () => {
    const service = ExportStrategyFactory.getService('csv');
    expect(service).toBeInstanceOf(CsvExportService);
    expect(service.format).toBe('csv');
  });

  it('json フォーマット時に JsonExportService を返す', () => {
    const service = ExportStrategyFactory.getService('json');
    expect(service).toBeInstanceOf(JsonExportService);
    expect(service.format).toBe('json');
  });

  it('html フォーマット時に HtmlExportService を返す', () => {
    const service = ExportStrategyFactory.getService('html');
    expect(service).toBeInstanceOf(HtmlExportService);
    expect(service.format).toBe('html');
  });

  it('同一フォーマットの2回目の呼び出しで同一インスタンスを再利用する', () => {
    const service1 = ExportStrategyFactory.getService('csv');
    const service2 = ExportStrategyFactory.getService('csv');
    expect(service1).toBe(service2);
  });

  it('未対応フォーマット指定時に適切なエラーをスローする', () => {
    expect(() => ExportStrategyFactory.getService('xml' as ExportFormat)).toThrowError(
      'Unsupported export format: xml'
    );
  });
});

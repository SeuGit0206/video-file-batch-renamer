import type { ExportData, ExportFormat, ExportOptions, ExportResult, ExportTarget } from '../../types/export';
import type { IExportService } from './IExportService';

/**
 * HTML文字エスケープ処理 (XSS対策)
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * HTMLレポートエクスポートサービス (IExportServiceの実装)
 */
export class HtmlExportService implements IExportService {
  public readonly format: ExportFormat = 'html';

  /**
   * 指定されたターゲットタイプに対応しているかを判定する
   */
  public supportsTarget(target: ExportTarget): boolean {
    return ['history', 'metadata', 'logs', 'statistics'].includes(target);
  }

  /**
   * データをHTMLフォーマットでエクスポートする
   */
  public async exportData(data: ExportData, options?: Partial<ExportOptions>): Promise<ExportResult> {
    const exportedAt = new Date().toISOString();
    const filename = options?.filename || `${data.title || 'export'}_${exportedAt.slice(0, 10)}.html`;
    const mimeType = 'text/html;charset=utf-8;';

    try {
      if (!data) {
        throw new Error('Export data cannot be null or undefined');
      }

      const items = Array.isArray(data.items) ? data.items : [];
      const title = escapeHtml(data.title || 'Export Report');
      const formattedDate = escapeHtml(data.exportedAt || exportedAt);

      // テーブルヘッダーの抽出
      let headers: string[] = [];
      if (items.length > 0 && typeof items[0] === 'object' && items[0] !== null) {
        headers = Object.keys(items[0] as Record<string, unknown>);
      }

      // テーブルヘッダーHTML生成
      const headerHtml = headers.length > 0
        ? `<tr>${headers.map((h) => `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: left;">${escapeHtml(h)}</th>`).join('')}</tr>`
        : '';

      // テーブルボディHTML生成
      const rowsHtml = items.map((item) => {
        if (typeof item === 'object' && item !== null) {
          const record = item as Record<string, unknown>;
          const cells = headers.map((header) => {
            const val = record[header];
            const valStr = val === null || val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
            return `<td style="border: 1px solid #ddd; padding: 8px;">${escapeHtml(valStr)}</td>`;
          });
          return `<tr>${cells.join('')}</tr>`;
        } else {
          return `<tr><td style="border: 1px solid #ddd; padding: 8px;">${escapeHtml(String(item))}</td></tr>`;
        }
      }).join('\n');

      const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 24px; color: #333; }
    h1 { color: #111; font-size: 24px; margin-bottom: 8px; }
    .meta { font-size: 14px; color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
    .summary { background-color: #f8f9fa; padding: 12px 16px; border-radius: 6px; border: 1px solid #e9ecef; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="summary">
    <div class="meta"><strong>出力日時:</strong> ${formattedDate}</div>
    <div class="meta"><strong>総件数:</strong> ${items.length} 件</div>
  </div>
  <table>
    <thead>
      ${headerHtml}
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: mimeType });

      return {
        success: true,
        format: 'html',
        filename,
        mimeType,
        content: htmlContent,
        blob,
        sizeBytes: blob.size,
        exportedAt,
      };
    } catch (error) {
      return {
        success: false,
        format: 'html',
        filename,
        mimeType,
        exportedAt,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

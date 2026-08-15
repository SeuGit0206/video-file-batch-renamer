import type { ExportData, ExportFormat, ExportOptions, ExportResult, ExportTarget } from '../../types/export';
import type { IExportService } from './IExportService';

/**
 * CSVエクスポートサービス (IExportServiceの実装)
 */
export class CsvExportService implements IExportService {
  public readonly format: ExportFormat = 'csv';

  /**
   * 指定されたターゲットタイプに対応しているかを判定する
   */
  public supportsTarget(target: ExportTarget): boolean {
    return ['history', 'metadata', 'logs', 'statistics'].includes(target);
  }

  /**
   * データをCSVフォーマットでエクスポートする
   */
  public async exportData(data: ExportData, options?: Partial<ExportOptions>): Promise<ExportResult> {
    const exportedAt = new Date().toISOString();
    const includeHeaders = options?.includeHeaders !== false;
    const sanitizeOutput = options?.sanitizeOutput !== false;
    const filename = options?.filename || `${data.title || 'export'}_${exportedAt.slice(0, 10)}.csv`;

    try {
      const items = data.items || [];
      if (!Array.isArray(items)) {
        throw new Error('Export items must be an array');
      }

      // ヘッダーの収集
      let headers: string[] = [];
      if (items.length > 0 && typeof items[0] === 'object' && items[0] !== null) {
        headers = Object.keys(items[0] as Record<string, unknown>);
      }

      const rows: string[] = [];

      // ヘッダー行追加
      if (includeHeaders && headers.length > 0) {
        const headerRow = headers.map((h) => this.formatCell(h, sanitizeOutput)).join(',');
        rows.push(headerRow);
      }

      // データ行追加
      for (const item of items) {
        if (typeof item === 'object' && item !== null) {
          const record = item as Record<string, unknown>;
          const rowCells = headers.map((header) => {
            const val = record[header];
            return this.formatCell(val, sanitizeOutput);
          });
          rows.push(rowCells.join(','));
        } else {
          rows.push(this.formatCell(item, sanitizeOutput));
        }
      }

      // UTF-8 (BOM付き)
      const csvString = '\uFEFF' + rows.join('\r\n');
      const mimeType = 'text/csv;charset=utf-8;';
      const blob = new Blob([csvString], { type: mimeType });

      return {
        success: true,
        format: 'csv',
        filename,
        mimeType,
        content: csvString,
        blob,
        sizeBytes: blob.size,
        exportedAt,
      };
    } catch (error) {
      return {
        success: false,
        format: 'csv',
        filename,
        mimeType: 'text/csv;charset=utf-8;',
        exportedAt,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * セル値のエスケープおよびCSV Formula Injection対策
   */
  private formatCell(value: unknown, sanitize: boolean): string {
    if (value === null || value === undefined) {
      return '""';
    }

    let str = typeof value === 'object' ? JSON.stringify(value) : String(value);

    // CSV Formula Injection 対策
    if (sanitize && typeof value === 'string' && value.length > 0) {
      const firstChar = str.charAt(0);
      if (['=', '+', '-', '@', '\t', '\r'].includes(firstChar)) {
        str = "'" + str;
      }
    }

    // ダブルクォートのエスケープ (" -> "")
    const needsQuotes = str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r') || str.startsWith("'");
    const escaped = str.replace(/"/g, '""');

    return needsQuotes ? `"${escaped}"` : `"${escaped}"`;
  }
}

import type { ExportData, ExportFormat, ExportOptions, ExportResult, ExportTarget } from '../../types/export';
import type { IExportService } from './IExportService';

/**
 * 循環参照を安全に処理するReplacer関数を生成する
 */
function getCircularReplacer() {
  const seen = new WeakSet();
  return (_key: string, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
}

/**
 * JSONエクスポートサービス (IExportServiceの実装)
 */
export class JsonExportService implements IExportService {
  public readonly format: ExportFormat = 'json';

  /**
   * 指定されたターゲットタイプに対応しているかを判定する
   * JSONフォーマットはすべてのターゲットタイプに対応
   */
  public supportsTarget(_target: ExportTarget): boolean {
    return true;
  }

  /**
   * データをJSONフォーマットでエクスポートする
   */
  public async exportData(data: ExportData, options?: Partial<ExportOptions>): Promise<ExportResult> {
    const exportedAt = new Date().toISOString();
    const filename = options?.filename || `${data.title || 'export'}_${exportedAt.slice(0, 10)}.json`;
    const mimeType = 'application/json;charset=utf-8;';

    try {
      if (!data) {
        throw new Error('Export data cannot be null or undefined');
      }

      const payload = {
        title: data.title || 'Export Data',
        exportedAt: data.exportedAt || exportedAt,
        itemsCount: Array.isArray(data.items) ? data.items.length : 0,
        metadata: data.metadata || {},
        items: data.items || [],
      };

      const jsonString = JSON.stringify(payload, getCircularReplacer(), 2);
      const blob = new Blob([jsonString], { type: mimeType });

      return {
        success: true,
        format: 'json',
        filename,
        mimeType,
        content: jsonString,
        blob,
        sizeBytes: blob.size,
        exportedAt,
      };
    } catch (error) {
      return {
        success: false,
        format: 'json',
        filename,
        mimeType,
        exportedAt,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

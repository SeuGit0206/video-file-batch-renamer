import { ImportValidationPolicy } from '../../policies/ImportValidationPolicy';
import type {
  ImportData,
  ImportFormat,
  ImportOptions,
  ImportResult,
  ImportTarget,
  ImportValidationResult,
} from '../../types/import';
import type { IImportService } from './IImportService';

/**
 * CSV行のエスケープ対応パーサー
 */
function parseCsvContent(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  const text = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // スキップ
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((field) => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * CSVフォーマットのインポートサービス (Strategy Pattern)
 */
export class CsvImportService implements IImportService {
  public readonly format: ImportFormat = 'csv';

  /**
   * 指定されたターゲットに対応しているかを判定する
   */
  public supportsTarget(target: ImportTarget): boolean {
    const supportedTargets: ImportTarget[] = [
      'history',
      'metadata',
      'logs',
      'settings',
      'presets',
    ];
    return supportedTargets.includes(target);
  }

  /**
   * CSV文字列をパースして ImportData 構造体に変換する
   */
  public async parse(
    content: string,
    options?: Partial<ImportOptions>
  ): Promise<ImportData> {
    if (!content || typeof content !== 'string' || content.trim() === '') {
      throw new Error('インポート用CSVデータが空です');
    }

    const rows = parseCsvContent(content);

    if (rows.length === 0) {
      throw new Error('CSVデータに行が含まれていません');
    }

    const headers = rows[0];
    if (!headers || headers.length === 0 || headers.every((h) => h === '')) {
      throw new Error('CSVヘッダー行が無効または存在しません');
    }

    const mappings = options?.fieldMappings || {};

    const items: Record<string, unknown>[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const record: Record<string, unknown> = {};

      headers.forEach((header, colIndex) => {
        if (!header) return;
        const targetKey = mappings[header] || header;
        const rawValue = row[colIndex] ?? '';

        // 数値・真偽値の型変換トライ
        if (rawValue === 'true') {
          record[targetKey] = true;
        } else if (rawValue === 'false') {
          record[targetKey] = false;
        } else if (
          rawValue !== '' &&
          !isNaN(Number(rawValue)) &&
          !isNaN(parseFloat(rawValue))
        ) {
          record[targetKey] = Number(rawValue);
        } else {
          record[targetKey] = rawValue;
        }
      });

      items.push(record);
    }

    const target: ImportTarget = options?.target || 'history';

    return {
      sourceFormat: this.format,
      target,
      items,
      importedAt: new Date().toISOString(),
    };
  }

  /**
   * ImportValidationPolicy を利用してデータを検証する
   */
  public async validate(
    data: ImportData,
    options?: Partial<ImportOptions>
  ): Promise<ImportValidationResult> {
    return ImportValidationPolicy.validateData(data, options);
  }

  /**
   * CSVデータのインポート処理を実行する
   */
  public async importData(
    data: ImportData,
    options?: Partial<ImportOptions>
  ): Promise<ImportResult> {
    const validation = await this.validate(data, options);

    if (!validation.isValid && !options?.allowPartialSuccess) {
      return {
        success: false,
        target: data.target,
        format: this.format,
        importedCount: 0,
        failedCount: data.items ? data.items.length : 0,
        errors: validation.errors,
        warnings: validation.warnings,
        timestamp: new Date().toISOString(),
        diff: validation.diff,
      };
    }

    return {
      success: true,
      target: data.target,
      format: this.format,
      importedCount: validation.recordCount,
      failedCount: 0,
      errors: validation.errors,
      warnings: validation.warnings,
      timestamp: new Date().toISOString(),
      diff: validation.diff,
    };
  }
}

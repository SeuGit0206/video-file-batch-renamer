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
 * JSONフォーマットのインポートサービス (Strategy Pattern)
 */
export class JsonImportService implements IImportService {
  public readonly format: ImportFormat = 'json';

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
   * JSON文字列をパースして ImportData 構造体に変換する
   */
  public async parse(
    content: string,
    options?: Partial<ImportOptions>
  ): Promise<ImportData> {
    if (!content || typeof content !== 'string' || content.trim() === '') {
      throw new Error('インポート用JSONデータが空です');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`JSONパースエラー: ${message}`);
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('JSONルートはオブジェクトまたは配列である必要があります');
    }

    const defaultTarget: ImportTarget = options?.target || 'history';

    // 配列がそのままルートに来ている場合
    if (Array.isArray(parsed)) {
      const items = parsed.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === 'object' && !Array.isArray(item)
      );
      return {
        sourceFormat: this.format,
        target: defaultTarget,
        items,
        importedAt: new Date().toISOString(),
      };
    }

    // オブジェクトがルートに来ている場合
    const obj = parsed as Record<string, unknown>;

    // items フィールドがある場合
    if (Array.isArray(obj.items)) {
      const items = obj.items.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === 'object' && !Array.isArray(item)
      );
      const target =
        typeof obj.target === 'string' && this.supportsTarget(obj.target as ImportTarget)
          ? (obj.target as ImportTarget)
          : defaultTarget;

      return {
        title: typeof obj.title === 'string' ? obj.title : undefined,
        importedAt:
          typeof obj.importedAt === 'string' ? obj.importedAt : new Date().toISOString(),
        sourceFormat: this.format,
        target,
        version: typeof obj.version === 'string' ? obj.version : undefined,
        items,
        metadata:
          obj.metadata && typeof obj.metadata === 'object' && !Array.isArray(obj.metadata)
            ? (obj.metadata as Record<string, unknown>)
            : undefined,
      };
    }

    // items フィールドがない単一オブジェクトの場合
    return {
      sourceFormat: this.format,
      target: defaultTarget,
      items: [obj],
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
   * JSONデータのインポート処理を実行する
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

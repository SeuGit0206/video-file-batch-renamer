import type {
  ImportData,
  ImportFormat,
  ImportMode,
  ImportOptions,
  ImportPreset,
  ImportRule,
  ImportTarget,
  ImportValidationResult,
} from '../types/import';

const VALID_FORMATS: readonly ImportFormat[] = ['json', 'csv', 'txt', 'xml'];
const VALID_TARGETS: readonly ImportTarget[] = ['history', 'metadata', 'logs', 'settings', 'presets'];
const VALID_MODES: readonly ImportMode[] = ['overwrite', 'merge', 'skip'];

/**
 * インポートデータの検証ポリシー (Clean Architecture & Policy Pattern)
 */
export class ImportValidationPolicy {
  /**
   * インポートデータ構造全般を検証し ValidationResult を返す
   */
  public static validateData(
    data: unknown,
    options?: Partial<ImportOptions>
  ): ImportValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: ['インポートデータはオブジェクトである必要があります'],
        warnings: [],
        recordCount: 0,
      };
    }

    const typedData = data as Partial<ImportData>;

    // フォーマット検証
    if (!typedData.sourceFormat || !VALID_FORMATS.includes(typedData.sourceFormat)) {
      errors.push(`無効なソースフォーマットです: ${String(typedData.sourceFormat)}`);
    }

    // ターゲット検証
    if (!typedData.target || !VALID_TARGETS.includes(typedData.target)) {
      errors.push(`無効なインポートターゲットです: ${String(typedData.target)}`);
    }

    // アイテム配列検証
    if (!Array.isArray(typedData.items)) {
      errors.push('インポートアイテム(items)は配列である必要があります');
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        warnings,
        recordCount: Array.isArray(typedData.items) ? typedData.items.length : 0,
      };
    }

    const items = typedData.items as Record<string, unknown>[];
    const recordCount = items.length;

    if (recordCount === 0) {
      warnings.push('インポート対象のデータレコードが0件です');
    }

    // 各アイテムの検証
    items.forEach((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        errors.push(`インデックス [${index}] のレコードはオブジェクトである必要があります`);
        return;
      }

      const keys = Object.keys(item);
      if (keys.length === 0) {
        warnings.push(`インデックス [${index}] のレコードは空のオブジェクトです`);
      }
    });

    // オプションが渡されている場合はオプションとの不整合チェック
    if (options) {
      if (options.format && typedData.sourceFormat && options.format !== typedData.sourceFormat) {
        warnings.push(
          `指定されたフォーマット (${options.format}) とデータソースフォーマット (${typedData.sourceFormat}) が一致しません`
        );
      }
      if (options.target && typedData.target && options.target !== typedData.target) {
        warnings.push(
          `指定されたターゲット (${options.target}) とデータターゲット (${typedData.target}) が一致しません`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recordCount,
      metadata: typedData.metadata,
    };
  }

  /**
   * インポートオプションの検証
   */
  public static validateOptions(options: unknown): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!options || typeof options !== 'object') {
      return { isValid: false, errors: ['インポートオプションはオブジェクトである必要があります'] };
    }

    const opts = options as Partial<ImportOptions>;

    if (!opts.format || !VALID_FORMATS.includes(opts.format)) {
      errors.push(`無効または指定なしのフォーマット: ${String(opts.format)}`);
    }

    if (!opts.target || !VALID_TARGETS.includes(opts.target)) {
      errors.push(`無効または指定なしのターゲット: ${String(opts.target)}`);
    }

    if (!opts.mode || !VALID_MODES.includes(opts.mode)) {
      errors.push(`無効または指定なしのモード: ${String(opts.mode)}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * マッピングルールの検証
   */
  public static validateRule(rule: unknown): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule || typeof rule !== 'object') {
      return { isValid: false, errors: ['インポートルールはオブジェクトである必要があります'] };
    }

    const r = rule as Partial<ImportRule>;

    if (!r.id || typeof r.id !== 'string' || r.id.trim() === '') {
      errors.push('ルールIDは必須の非空文字列です');
    }

    if (!r.sourceField || typeof r.sourceField !== 'string' || r.sourceField.trim() === '') {
      errors.push('ソースフィールド名は必須の非空文字列です');
    }

    if (!r.targetField || typeof r.targetField !== 'string' || r.targetField.trim() === '') {
      errors.push('ターゲットフィールド名は必須の非空文字列です');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * プリセットの検証
   */
  public static validatePreset(preset: unknown): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!preset || typeof preset !== 'object') {
      return { isValid: false, errors: ['インポートプリセットはオブジェクトである必要があります'] };
    }

    const p = preset as Partial<ImportPreset>;

    if (!p.id || typeof p.id !== 'string' || p.id.trim() === '') {
      errors.push('プリセットIDは必須です');
    }

    if (!p.name || typeof p.name !== 'string' || p.name.trim() === '') {
      errors.push('プリセット名は必須です');
    }

    if (!p.format || !VALID_FORMATS.includes(p.format)) {
      errors.push(`無効なプリセットフォーマット: ${String(p.format)}`);
    }

    if (!p.target || !VALID_TARGETS.includes(p.target)) {
      errors.push(`無効なプリセットターゲット: ${String(p.target)}`);
    }

    if (!p.defaultMode || !VALID_MODES.includes(p.defaultMode)) {
      errors.push(`無効なプリセットデフォルトモード: ${String(p.defaultMode)}`);
    }

    if (!Array.isArray(p.rules)) {
      errors.push('ルール一覧(rules)は配列である必要があります');
    } else {
      p.rules.forEach((rule, idx) => {
        const ruleVal = this.validateRule(rule);
        if (!ruleVal.isValid) {
          errors.push(`ルール [${idx}] が無効です: ${ruleVal.errors.join(', ')}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

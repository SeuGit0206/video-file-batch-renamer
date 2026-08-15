import { BaseAppError } from '../errors';

export class ValidationError extends BaseAppError {
  public validationErrors: string[];

  constructor(message: string, validationErrors: string[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
  }
}

export interface ValidationRule<T> {
  field: keyof T | string;
  validate: (value: unknown) => boolean;
  message: string;
}

export interface IRequestValidator {
  validateMetadataRequest(id: unknown): string;
  validateObject<T extends object>(data: unknown, rules: ValidationRule<T>[]): T;
}

export class RequestValidator implements IRequestValidator {
  /**
   * DVD/AV作品IDの形式検証 (例: ABC-123, MIDE-001 等)
   */
  public validateMetadataRequest(id: unknown): string {
    if (typeof id !== 'string' || !id.trim()) {
      throw new ValidationError('ID parameter is required and must be a non-empty string', [
        'id parameter is missing or empty',
      ]);
    }

    const trimmed = id.trim().toUpperCase();

    // ID長制限 (最長50文字)
    if (trimmed.length > 50) {
      throw new ValidationError('ID parameter exceeds maximum allowed length of 50 characters', [
        'id length exceeds limit',
      ]);
    }

    // 基本的な英数字・ハイフン・アンダースコア許可パターン
    const validPattern = /^[A-Z0-9_-]+$/;
    if (!validPattern.test(trimmed)) {
      throw new ValidationError(`Invalid ID format: '${trimmed}'. Only alphanumeric characters, hyphens, and underscores are allowed.`, [
        'id contains forbidden characters',
      ]);
    }

    return trimmed;
  }

  /**
   * 汎用オブジェクト/DTOのスキーマルール検証
   */
  public validateObject<T extends object>(data: unknown, rules: ValidationRule<T>[]): T {
    if (!data || typeof data !== 'object') {
      throw new ValidationError('Request body/data must be a non-null object', ['data is not an object']);
    }

    const errors: string[] = [];
    const record = data as Record<string, unknown>;

    for (const rule of rules) {
      const fieldName = String(rule.field);
      const val = record[fieldName];
      if (!rule.validate(val)) {
        errors.push(`${fieldName}: ${rule.message}`);
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed for input data', errors);
    }

    return data as T;
  }
}

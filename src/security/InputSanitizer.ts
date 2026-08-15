export interface IInputSanitizer {
  sanitizeString(input: string): string;
  sanitizeObject<T>(obj: T): T;
}

export class InputSanitizer implements IInputSanitizer {
  public sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // 1. ヌルバイト除去
    let sanitized = input.replace(/\0/g, '');

    // 2. 危険なスクリプトタグ / イベントハンドラの簡易エスケープ・除外
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/javascript:/gi, '');

    // 3. HTML特殊文字のエスケープ (& < > " ')
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    return sanitized.trim();
  }

  public sanitizeObject<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const sanitizedObj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanKey = this.sanitizeString(key);
        sanitizedObj[cleanKey] = this.sanitizeObject(value);
      }
      return sanitizedObj as T;
    }

    return obj;
  }
}

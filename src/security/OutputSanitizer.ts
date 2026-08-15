import type { ScrapedMetadata } from '../types';

export interface IOutputSanitizer {
  sanitize<T>(data: T): T;
  sanitizeMetadata(metadata: ScrapedMetadata): ScrapedMetadata;
}

export class OutputSanitizer implements IOutputSanitizer {
  public sanitize<T>(data: T): T {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return this.sanitizeString(data) as unknown as T;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item)) as unknown as T;
    }

    if (typeof data === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(data)) {
        result[key] = this.sanitize(val);
      }
      return result as T;
    }

    return data;
  }

  public sanitizeMetadata(metadata: ScrapedMetadata): ScrapedMetadata {
    const record = metadata as unknown as Record<string, unknown>;
    return {
      ...metadata,
      title: metadata.title ? this.sanitizeString(metadata.title) : undefined,
      actress: metadata.actress ? this.sanitizeString(metadata.actress) : undefined,
      maker: metadata.maker ? this.sanitizeString(metadata.maker) : undefined,
      series: metadata.series ? this.sanitizeString(metadata.series) : undefined,
      ...(record.artist ? { artist: this.sanitizeString(String(record.artist)) } : {}),
      ...(record.code ? { code: this.sanitizeString(String(record.code)) } : {}),
      ...(record.genres && Array.isArray(record.genres) ? { genres: record.genres.map((g) => this.sanitizeString(String(g))) } : {}),
      ...(record.actresses && Array.isArray(record.actresses) ? { actresses: record.actresses.map((a) => this.sanitizeString(String(a))) } : {}),
      ...(record.label ? { label: this.sanitizeString(String(record.label)) } : {}),
      ...(record.director ? { director: this.sanitizeString(String(record.director)) } : {}),
    };
  }

  private sanitizeString(str: string): string {
    if (!str) return '';
    // XSSタグと制御文字の無害化
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<\/?script.*?>/gi, '')
      .replace(/[<>]/g, '')
      .trim();
  }
}

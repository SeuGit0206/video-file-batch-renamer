import { TitleCleaner } from './TitleCleaner';
import { FileNameSanitizer } from './FileNameSanitizer';

export interface FormatterMetadata {
  productId?: string;
  title?: string;
  actress?: string;
  releaseDate?: string;
  series?: string;
  maker?: string;
  label?: string;
}

/**
 * 命名規則テンプレート展開およびファイル名・相対パス生成
 */
export class FileNameFormatter {
  public static format(
    template: string,
    metadata: FormatterMetadata | null | undefined,
    ext?: string | null
  ): string {
    if (!metadata) throw new Error('Metadata cannot be null');

    let result = template || '{title}';
    const cleanTitle = TitleCleaner.clean(metadata.title || '', metadata.productId);

    result = result.replace(/{id}/g, (metadata.productId || '').trim());
    result = result.replace(/{title}/g, cleanTitle);
    result = result.replace(/{actress}/g, (metadata.actress || '').trim());
    result = result.replace(/{date}/g, (metadata.releaseDate || '').trim());
    result = result.replace(/{series}/g, (metadata.series || '').trim());
    result = result.replace(/{maker}/g, (metadata.maker || metadata.series || 'Maker').trim());

    result = result.trim();
    if (!result) {
      result = cleanTitle || metadata.productId || 'unnamed';
    }

    return FileNameSanitizer.sanitize(result, ext);
  }

  public static formatRelativePath(
    template: string,
    metadata: FormatterMetadata | null | undefined,
    ext?: string | null
  ): string {
    if (!metadata) throw new Error('Metadata cannot be null');

    let result = template || '{title}';
    const cleanTitle = TitleCleaner.clean(metadata.title || '', metadata.productId);

    result = result.replace(/{id}/g, (metadata.productId || '').trim());
    result = result.replace(/{title}/g, cleanTitle);
    result = result.replace(/{actress}/g, (metadata.actress || '').trim());
    result = result.replace(/{date}/g, (metadata.releaseDate || '').trim());
    result = result.replace(/{series}/g, (metadata.series || '').trim());
    result = result.replace(/{maker}/g, (metadata.maker || metadata.series || 'Maker').trim());

    result = result.trim();
    if (!result) {
      result = cleanTitle || metadata.productId || 'unnamed';
    }

    const normalized = result.replace(/\\/g, '/');
    const rawSegments = normalized.split('/').map(s => s.trim()).filter(s => s.length > 0);

    if (rawSegments.length === 0) {
      return FileNameSanitizer.sanitizeSegment('unnamed', true, ext);
    }

    const safeSegments: string[] = [];
    for (let i = 0; i < rawSegments.length; i++) {
      const isLast = i === rawSegments.length - 1;
      let seg = rawSegments[i];

      if (seg === '..' || seg === '.') {
        seg = seg === '..' ? '．．' : '．';
      } else if (/^[a-zA-Z]:$/i.test(seg)) {
        seg = seg.replace(':', '：');
      }

      const sanitized = FileNameSanitizer.sanitizeSegment(seg, isLast, isLast ? ext : undefined);
      if (sanitized) {
        safeSegments.push(sanitized);
      }
    }

    return safeSegments.join('/');
  }
}

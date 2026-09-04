import { WindowsPathHelper } from './WindowsPathHelper';

/**
 * ファイル名・ディレクトリ名のOS制約サニタイズユーティリティ
 */
export class FileNameSanitizer {
  public static sanitize(fileName: string, ext?: string | null): string {
    let base = fileName || 'unnamed';
    base = WindowsPathHelper.sanitize(base);
    base = base.replace(/[\s\r\n\t]+/g, ' ').trim();
    base = base.replace(/[\s.]*$/, '');
    if (!base) base = 'unnamed';

    if (/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(base)) {
      base += '_';
    }

    const cleanExt = ext ? (ext.startsWith('.') ? ext : `.${ext}`) : '';
    const maxBaseLen = 250 - cleanExt.length;
    const chars = Array.from(base);
    if (chars.length > maxBaseLen) {
      base = chars.slice(0, maxBaseLen - 3).join('') + '...';
    }

    return base + cleanExt;
  }

  public static sanitizeSegment(segment: string, isFile: boolean, ext?: string | null): string {
    let base = segment || (isFile ? 'unnamed' : 'unnamed_dir');
    base = WindowsPathHelper.sanitize(base);
    base = base.replace(/[\s\r\n\t]+/g, ' ').trim();
    base = base.replace(/[\s.]*$/, '');
    if (!base) base = isFile ? 'unnamed' : 'unnamed_dir';

    if (/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(base)) {
      base += '_';
    }

    const cleanExt = isFile && ext ? (ext.startsWith('.') ? ext : `.${ext}`) : '';
    const maxBaseLen = (isFile ? 250 : 240) - cleanExt.length;
    const chars = Array.from(base);
    if (chars.length > maxBaseLen) {
      base = chars.slice(0, maxBaseLen - 3).join('') + '...';
    }

    return base + cleanExt;
  }
}

/**
 * Windowsパス禁止文字エスケープユーティリティ
 */
export class WindowsPathHelper {
  public static sanitize(segment: string): string {
    if (!segment) return '';
    return segment
      .replace(/\\/g, '＼')
      .replace(/\//g, '／')
      .replace(/:/g, '：')
      .replace(/\*/g, '＊')
      .replace(/\?/g, '？')
      .replace(/"/g, '”')
      .replace(/</g, '＜')
      .replace(/>/g, '＞')
      .replace(/\|/g, '｜');
  }
}

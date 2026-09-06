/**
 * 作品ID抽出ユーティリティ
 * ファイル名から品番 (例: ABP-123, FC2-PPV-1234567, CARIBBEAN-123, 010123_001) を抽出
 */
export function extractIdFromFilename(name: string, customPat?: string): string {
  const base = name.split('.').slice(0, -1).join('.') || name;

  if (customPat && customPat.trim() !== '') {
    try {
      let patternStr = customPat;
      const flags = 'i';
      if (customPat.startsWith('(?i)')) {
        patternStr = customPat.replace('(?i)', '');
      }
      const regex = new RegExp(patternStr, flags);
      const match = base.match(regex);
      if (match) return match[0].toUpperCase();
    } catch {
      // Fallback
    }
  }

  const fc2Match = base.match(/(fc2-ppv|fc2ppv)-?([0-9]{5,8})/i);
  if (fc2Match) return `FC2-PPV-${fc2Match[2]}`;

  const hyphenMatch = base.match(/(?:^|[^a-zA-Z0-9])([a-zA-Z]{2,10})-([0-9]{2,5})(?:[^0-9]|$)/i);
  if (hyphenMatch) return `${hyphenMatch[1].toUpperCase()}-${hyphenMatch[2]}`;

  const noHyphenMatch = base.match(/([a-zA-Z]{2,6})([0-9]{3,5})/);
  if (noHyphenMatch) return `${noHyphenMatch[1].toUpperCase()}-${noHyphenMatch[2]}`;

  const caribbeanMatch = base.match(/([0-9]{6})_([0-9]{3})/);
  if (caribbeanMatch) return caribbeanMatch[0];

  return '';
}

export class RegexProductIdExtractor {
  public static extract(name: string, customPat?: string): string {
    return extractIdFromFilename(name, customPat);
  }
}

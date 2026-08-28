import { describe, it, expect } from 'vitest';

/**
 * Regex Product ID Extractor logic test suite for Phase 53 Step 5
 */
function extractIdFromFilename(name: string, customPat?: string): string {
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
      // ignore
    }
  }

  const fc2Match = base.match(/(fc2-ppv|fc2ppv)-?([0-9]{5,8})/i);
  if (fc2Match) {
    return `FC2-PPV-${fc2Match[2]}`;
  }

  const hyphenMatch = base.match(/(?:^|[^a-zA-Z0-9])([a-zA-Z]{2,10})-([0-9]{2,5})(?:[^0-9]|$)/i);
  if (hyphenMatch) {
    return `${hyphenMatch[1].toUpperCase()}-${hyphenMatch[2]}`;
  }

  const noHyphenMatch = base.match(/([a-zA-Z]{2,6})([0-9]{3,5})/);
  if (noHyphenMatch) {
    return `${noHyphenMatch[1].toUpperCase()}-${noHyphenMatch[2]}`;
  }

  const caribbeanMatch = base.match(/([0-9]{6})_([0-9]{3})/);
  if (caribbeanMatch) {
    return caribbeanMatch[0];
  }

  return '';
}

describe('RegexProductIdExtractor Unit Tests', () => {
  it('標準形式 (ABC-123) を正常に抽出できること', () => {
    expect(extractIdFromFilename('ssni-001.mp4')).toBe('SSNI-001');
    expect(extractIdFromFilename('abc-123.mp4')).toBe('ABC-123');
    expect(extractIdFromFilename('abp-001.mp4')).toBe('ABP-001');
    expect(extractIdFromFilename('[1080p] ipx-420_sub.mkv')).toBe('IPX-420');
  });

  it('長い英字プレフィックスおよびINVALID-9999を正常に抽出できること (Phase 91)', () => {
    expect(extractIdFromFilename('INVALID-9999_error.mp4')).toBe('INVALID-9999');
    expect(extractIdFromFilename('caribbean-123.mp4')).toBe('CARIBBEAN-123');
    expect(extractIdFromFilename('prestige-01.mp4')).toBe('PRESTIGE-01');
    expect(extractIdFromFilename('[HD] PRESTIGE-01_uncensored.mp4')).toBe('PRESTIGE-01');
    expect(extractIdFromFilename('1080p_INVALID-9999_sample.mp4')).toBe('INVALID-9999');
  });

  it('一般的なファイル名での誤検出を防止できること', () => {
    expect(extractIdFromFilename('video-123456.mp4')).toBe('');
    expect(extractIdFromFilename('sample-1.mp4')).toBe('');
    expect(extractIdFromFilename('my-video-clip.mp4')).toBe('');
  });

  it('ハイフン無しの形式 (ABC12345) を正常に抽出できること', () => {
    expect(extractIdFromFilename('ssni001.mp4')).toBe('SSNI-001');
    expect(extractIdFromFilename('ipx420.mkv')).toBe('IPX-420');
  });

  it('FC2-PPV 形式を正常に抽出できること', () => {
    expect(extractIdFromFilename('fc2-ppv-1234567.mp4')).toBe('FC2-PPV-1234567');
    expect(extractIdFromFilename('fc2ppv1234567.mp4')).toBe('FC2-PPV-1234567');
    expect(extractIdFromFilename('FC2-PPV-102934.mp4')).toBe('FC2-PPV-102934');
  });

  it('カリビアンコム形式 (010123_001) を正常に抽出できること', () => {
    expect(extractIdFromFilename('010123_001.mp4')).toBe('010123_001');
  });

  it('IDが存在しないファイル名では空文字列を返すこと', () => {
    expect(extractIdFromFilename('vacation_video.mp4')).toBe('');
    expect(extractIdFromFilename('')).toBe('');
  });

  it('カスタム正規表現パターンで抽出できること', () => {
    const customPat = '(?i)\\b[a-z]{3}-[0-9]{3}\\b';
    expect(extractIdFromFilename('test-abc-123-video.mp4', customPat)).toBe('ABC-123');
  });
});

import { describe, it, expect } from 'vitest';
import { extractIdFromFilename } from '../src/extractors/RegexProductIdExtractor';

/**
 * Regex Product ID Extractor logic test suite for Phase 53 Step 5 & Phase 92 Step 3
 */
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

  it('境界値および特殊入力（大文字小文字混在、空文字、記号混じり）を安全に処理できること', () => {
    // 大文字小文字混在
    expect(extractIdFromFilename('sSnI-001_1080p.mp4')).toBe('SSNI-001');
    expect(extractIdFromFilename('MiDv123.avi')).toBe('MIDV-123');
    // 特殊記号・カッコ混じり
    expect(extractIdFromFilename('【超高画質】[FHD] ABP-999 (Uncensored).mp4')).toBe('ABP-999');
    expect(extractIdFromFilename('(Tokyo-Hot) n1234.mp4')).toBe('');
    // 短い数字・長い数字の境界
    expect(extractIdFromFilename('PRESTIGE-01.mp4')).toBe('PRESTIGE-01');
    expect(extractIdFromFilename('TEST-12345.mp4')).toBe('TEST-12345');
    // 拡張子のないファイル名
    expect(extractIdFromFilename('IPX-888')).toBe('IPX-888');
  });
});

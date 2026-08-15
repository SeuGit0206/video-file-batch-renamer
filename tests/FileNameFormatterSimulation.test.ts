import { describe, it, expect } from 'vitest';

function cleanTitle(title: string, productId?: string): string {
  if (!title) return '';
  let cleaned = title.replace(/[\r\n\t]/g, ' ').replace(/　/g, ' ');

  const unwantedPatterns = [
    /\s*[|#-]\s*(?:MissAV|オンラインで無料|無料|High Quality|Subbed|日本語字幕|AV女優一覧|AV女優|無料動画|高画質|オンライン視聴).*$/gi,
    /- MissAV\.ai/gi,
    /\| MissAV\.ai/gi,
    /無料動画/g,
    /高画質/g,
  ];
  for (const pat of unwantedPatterns) {
    cleaned = cleaned.replace(pat, '');
  }

  if (productId && productId.trim() !== '') {
    const id = productId.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const idNoHyphen = productId.trim().replace(/-/g, '').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const reId = new RegExp(`(?<![A-Za-z0-9])${id}(?![A-Za-z0-9])`, 'gi');
    const reIdNoHyphen = new RegExp(`(?<![A-Za-z0-9])${idNoHyphen}(?![A-Za-z0-9])`, 'gi');
    cleaned = cleaned.replace(reId, '').replace(reIdNoHyphen, '');
  }

  cleaned = cleaned.replace(/【[^】]*】/g, '').replace(/\[[^\]]*\]/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/^[\s\-_|+#/\\]+|[\s\-_|+#/\\]+$/g, '');
  return cleaned.trim();
}

function sanitizeFileName(fileName: string, ext?: string): string {
  let base = fileName || 'unnamed';
  base = base
    .replace(/\\/g, '＼')
    .replace(/\//g, '／')
    .replace(/:/g, '：')
    .replace(/\*/g, '＊')
    .replace(/\?/g, '？')
    .replace(/"/g, '”')
    .replace(/</g, '＜')
    .replace(/>/g, '＞')
    .replace(/\|/g, '｜');

  base = base.replace(/[\s\r\n\t]+/g, ' ').trim().replace(/[\s.]*$/, '');
  if (!base) base = 'unnamed';

  if (/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(base)) {
    base += '_';
  }

  const cleanExt = ext ? (ext.startsWith('.') ? ext : `.${ext}`) : '';
  const maxBaseLen = 250 - cleanExt.length;
  if (base.length > maxBaseLen) {
    const chars = Array.from(base);
    base = chars.slice(0, maxBaseLen - 3).join('') + '...';
  }
  return base + cleanExt;
}

function sanitizeSegment(segment: string, isFile: boolean, ext?: string): string {
  let base = segment || (isFile ? 'unnamed' : 'unnamed_dir');
  base = base
    .replace(/\\/g, '＼')
    .replace(/\//g, '／')
    .replace(/:/g, '：')
    .replace(/\*/g, '＊')
    .replace(/\?/g, '？')
    .replace(/"/g, '”')
    .replace(/</g, '＜')
    .replace(/>/g, '＞')
    .replace(/\|/g, '｜');

  base = base.replace(/[\s\r\n\t]+/g, ' ').trim().replace(/[\s.]*$/, '');
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

function formatRelativePath(
  template: string,
  metadata: { productId: string; title: string; actress: string; releaseDate: string; series: string },
  ext: string
): string {
  let raw = template || '{title}';
  const cTitle = cleanTitle(metadata.title, metadata.productId);

  raw = raw.replace(/{id}/g, (metadata.productId || '').trim());
  raw = raw.replace(/{title}/g, cTitle);
  raw = raw.replace(/{actress}/g, (metadata.actress || '').trim());
  raw = raw.replace(/{date}/g, (metadata.releaseDate || '').trim());
  raw = raw.replace(/{series}/g, (metadata.series || '').trim());
  raw = raw.replace(/{maker}/g, (metadata.series || 'Maker').trim());

  raw = raw.trim();
  if (!raw) {
    raw = cTitle || metadata.productId || 'unnamed';
  }

  const normalized = raw.replace(/\\/g, '/');
  const rawSegments = normalized.split('/').map(s => s.trim()).filter(s => s.length > 0);

  if (rawSegments.length === 0) {
    return sanitizeSegment('unnamed', true, ext);
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

    const sanitized = sanitizeSegment(seg, isLast, isLast ? ext : undefined);
    if (sanitized) {
      safeSegments.push(sanitized);
    }
  }

  return safeSegments.join('/');
}

function formatFileName(
  template: string,
  metadata: { productId: string; title: string; actress: string; releaseDate: string; series: string },
  ext: string
): string {
  let result = template || '{title}';
  const cTitle = cleanTitle(metadata.title, metadata.productId);

  result = result.replace(/{id}/g, (metadata.productId || '').trim());
  result = result.replace(/{title}/g, cTitle);
  result = result.replace(/{actress}/g, (metadata.actress || '').trim());
  result = result.replace(/{date}/g, (metadata.releaseDate || '').trim());
  result = result.replace(/{series}/g, (metadata.series || '').trim());
  result = result.replace(/{maker}/g, (metadata.series || 'Maker').trim());

  return sanitizeFileName(result.trim(), ext);
}

describe('FileNameFormatter Simulation Test Suite', () => {
  it('テンプレートに基づいて各種プレビュー文字列を生成できること', () => {
    const meta = {
      productId: 'SSNI-001',
      title: 'SSNI-001 三上悠亜 豪華作品',
      actress: '三上悠亜',
      releaseDate: '2021-01-01',
      series: 'S1',
    };

    const formattedStd = formatFileName('{id}_{title}', meta, 'mp4');
    expect(formattedStd).toBe('SSNI-001_三上悠亜 豪華作品.mp4');

    const formattedFolder = formatFileName('{actress}/{id}_{title}', meta, 'mp4');
    expect(formattedFolder).toBe('三上悠亜／SSNI-001_三上悠亜 豪華作品.mp4');

    const formattedMaker = formatFileName('{maker}/{date}_{id}', meta, 'mp4');
    expect(formattedMaker).toBe('S1／2021-01-01_SSNI-001.mp4');
  });

  it('Windows禁止文字 (\\ / : * ? " < > |) が安全に置き換えられること', () => {
    const meta = {
      productId: 'IPX-420',
      title: 'タイトル:テスト?禁止文字*含む/スラッシュ',
      actress: '女優',
      releaseDate: '2022-02-02',
      series: 'Series',
    };
    const res = formatFileName('{id}_{title}', meta, 'mkv');
    expect(res).not.toContain(':');
    expect(res).not.toContain('?');
    expect(res).not.toContain('*');
    expect(res).not.toContain('/');
    expect(res).toBe('IPX-420_タイトル：テスト？禁止文字＊含む／スラッシュ.mkv');
  });

  it('同名ファイルの競合発生時に連番を正常付与できるロジックをテスト', () => {
    const existing = new Set<string>();
    const files = ['SSNI-001_三上悠亜.mp4', 'SSNI-001_三上悠亜.mp4', 'SSNI-001_三上悠亜.mp4'];

    const resolved = files.map((fileName) => {
      const ext = '.mp4';
      const rawBase = fileName.substring(0, fileName.length - ext.length);
      let candidate = fileName;
      let counter = 1;
      while (existing.has(candidate.toLowerCase())) {
        counter++;
        candidate = `${rawBase}_${counter}${ext}`;
      }
      existing.add(candidate.toLowerCase());
      return candidate;
    });

    expect(resolved[0]).toBe('SSNI-001_三上悠亜.mp4');
    expect(resolved[1]).toBe('SSNI-001_三上悠亜_2.mp4');
    expect(resolved[2]).toBe('SSNI-001_三上悠亜_3.mp4');
  });

  it('超長タイトルの文字数制限 (250文字以内) をクリアすること', () => {
    const longTitle = 'あ'.repeat(300);
    const meta = {
      productId: 'ABC-123',
      title: longTitle,
      actress: '女優',
      releaseDate: '2023-03-03',
      series: 'Series',
    };
    const res = formatFileName('{id}_{title}', meta, 'mp4');
    expect(res.length).toBeLessThanOrEqual(250);
    expect(res).toContain('...');
  });

  describe('Edge Case Test Scenarios (Phase 68 Step 3)', () => {
    it('Windows予約名 (CON, PRN, AUX, NUL, COM1-9, LPT1-9) が安全にエスケープされること', () => {
      const reservedNames = ['CON', 'con', 'PRN', 'AUX', 'NUL', 'COM1', 'com9', 'LPT1', 'lpt9'];
      for (const rName of reservedNames) {
        const res = sanitizeFileName(rName, 'mp4');
        expect(res).toBe(`${rName}_.mp4`);
      }
    });

    it('末尾のピリオドおよび空白文字が安全に除外されること', () => {
      const res1 = sanitizeFileName('sample_title. . . ', 'mp4');
      expect(res1).toBe('sample_title.mp4');

      const res2 = sanitizeFileName('  spaces_and_dots . . ', 'mkv');
      expect(res2).toBe('spaces_and_dots.mkv');
    });

    it('Unicode・絵文字・サロゲートペアを含む特殊文字列が壊れずに保持されること', () => {
      const unicodeTitle = '🌸 豪華特選作品 😀 𩸽 (サロゲートペア & 複合Unicode)';
      const meta = {
        productId: 'UNICODE-001',
        title: unicodeTitle,
        actress: '花子🌸',
        releaseDate: '2026-08-10',
        series: 'UnicodeSeries',
      };
      const res = formatFileName('{id}_{actress}_{title}', meta, 'mp4');
      expect(res).toContain('🌸');
      expect(res).toContain('😀');
      expect(res).toContain('UNICODE-001');
      expect(res.endsWith('.mp4')).toBe(true);
    });

    it('Path Traversal相当のパス区切り記号 (../ や ..\\) が安全に全角置換されパス侵害を防ぐこと', () => {
      const res = sanitizeFileName('../../CON.mp4', 'mp4');
      expect(res).not.toContain('/');
      expect(res).not.toContain('\\');
      expect(res).toBe('..／..／CON.mp4.mp4');
    });

    it('多重拡張子および拡張子無しのファイル名が正しく取り扱われること', () => {
      const multiExtRes = sanitizeFileName('archive.v1.0.final', 'mp4');
      expect(multiExtRes).toBe('archive.v1.0.final.mp4');

      const noExtRes = sanitizeFileName('no_extension_file', '');
      expect(noExtRes).toBe('no_extension_file');
    });
  });

  describe('Subfolder Auto-Sorting Prototype (Phase 69 Step 3)', () => {
    const defaultMeta = {
      productId: 'ABC-123',
      title: '豪華サンプル作品',
      actress: '女優A',
      releaseDate: '2026-08-10',
      series: 'シリーズX',
    };

    it('正常系: {actress}/{id}_{title} および {series}/{date}/{id}_{title} で正しく安全な相対パスが生成されること', () => {
      const path1 = formatRelativePath('{actress}/{id}_{title}', defaultMeta, 'mp4');
      expect(path1).toBe('女優A/ABC-123_豪華サンプル作品.mp4');

      const path2 = formatRelativePath('{series}/{date}/{id}_{title}', defaultMeta, 'mkv');
      expect(path2).toBe('シリーズX/2026-08-10/ABC-123_豪華サンプル作品.mkv');
    });

    it('後方互換性: 階層無しの既存テンプレートで単一ファイル名相対パスが返されること', () => {
      const path = formatRelativePath('{id}_{title}', defaultMeta, 'mp4');
      expect(path).toBe('ABC-123_豪華サンプル作品.mp4');
    });

    it('Path Traversal防止: ../../, ..\\..\\, C:\\ などのパス脱出表現が安全化されること', () => {
      const maliciousMeta = {
        ...defaultMeta,
        actress: '../../outside_actor',
        series: 'C:\\Windows\\System32',
      };

      const path1 = formatRelativePath('{actress}/{id}_{title}', maliciousMeta, 'mp4');
      expect(path1).not.toContain('..');
      expect(path1).toBe('．．/．．/outside_actor/ABC-123_豪華サンプル作品.mp4');

      const path2 = formatRelativePath('{series}/{id}', maliciousMeta, 'mp4');
      expect(path2).not.toContain('C:');
      expect(path2).toBe('C：/Windows/System32/ABC-123.mp4');
    });

    it('Windows予約名: ディレクトリセグメントに CON, PRN 等が含まれる場合にエスケープされること', () => {
      const reservedMeta = {
        ...defaultMeta,
        actress: 'CON',
        series: 'AUX',
      };
      const path = formatRelativePath('{series}/{actress}/{id}', reservedMeta, 'mp4');
      expect(path).toBe('AUX_/CON_/ABC-123.mp4');
    });

    it('特殊文字・サロゲートペア・絵文字: サブフォルダ名がUnicode/絵文字を含む場合に正しく保持されること', () => {
      const emojiMeta = {
        ...defaultMeta,
        actress: '🌸花子😀𩸽',
      };
      const path = formatRelativePath('{actress}/{id}_{title}', emojiMeta, 'mp4');
      expect(path).toContain('🌸花子😀𩸽');
      expect(path).toBe('🌸花子😀𩸽/ABC-123_豪華サンプル作品.mp4');
    });

    it('末尾ドット・空白除去: ディレクトリ名およびファイル名末尾の不適切なドット・空白が除去されること', () => {
      const dotMeta = {
        ...defaultMeta,
        actress: '女優A. . . ',
      };
      const path = formatRelativePath('{actress}/{id}. . . ', dotMeta, 'mp4');
      expect(path).toBe('女優A/ABC-123.mp4');
    });
  });
});

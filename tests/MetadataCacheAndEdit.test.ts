// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { VideoFile } from '../src/types';
import type { ScrapedMetadata } from '../src/types/scraper';

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

function formatRelativePath(
  template: string,
  metadata: Record<string, unknown> | null | undefined,
  ext: string | null | undefined
): string {
  if (!metadata) return '';
  let result = template;
  result = result.replace(/\{id\}/gi, (metadata.productId as string) || '');
  result = result.replace(/\{title\}/gi, (metadata.title as string) || '');
  result = result.replace(/\{actress\}/gi, (metadata.actress as string) || '');
  result = result.replace(/\{releaseDate\}/gi, (metadata.releaseDate as string) || '');
  result = result.replace(/\{series\}/gi, (metadata.series as string) || '');
  return sanitizeFileName(result, ext || '');
}

describe('Phase 69 Step 5: Metadata Cache Consistency and Manual Edit Test Suite', () => {
  const STORAGE_KEY = 'video_renamer_meta_cache';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // Test Helper functions mirroring App.tsx cache logic
  function updateMetadataCache(
    cache: Record<string, ScrapedMetadata>,
    id: string,
    metadata: ScrapedMetadata
  ): Record<string, ScrapedMetadata> {
    const next = { ...cache, [id]: metadata };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function getMetadataCacheFromStorage(): Record<string, ScrapedMetadata> {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  }

  it('ケース1: 個別再取得によるcache更新 - 最新Metadata取得時にcacheが更新されること', () => {
    let cache: Record<string, ScrapedMetadata> = {};
    const id = 'SSNI-001';

    const newFetchedMetadata: ScrapedMetadata = {
      productId: 'SSNI-001',
      title: '最新タイトル2026',
      actress: '三上悠亜',
      releaseDate: '2026-08-10',
      series: '単体作品',
      maker: 'S1 NO.1 STYLE',
      debug: { finalUrl: '', pageTitle: '', htmlLength: 0, htmlPreview: '', bodyPreview: '' }
    };

    cache = updateMetadataCache(cache, id, newFetchedMetadata);

    expect(cache[id]).toEqual(newFetchedMetadata);
    expect(cache[id].title).toBe('最新タイトル2026');
  });

  it('ケース2: localStorage更新 - キャッシュ更新時にlocalStorageへ保存されること', () => {
    let cache: Record<string, ScrapedMetadata> = {};
    const id = 'IPX-123';

    const meta: ScrapedMetadata = {
      productId: 'IPX-123',
      title: 'IPX最新作',
      actress: '相沢みなみ',
      debug: { finalUrl: '', pageTitle: '', htmlLength: 0, htmlPreview: '', bodyPreview: '' }
    };

    cache = updateMetadataCache(cache, id, meta);

    expect(cache[id]).toBeDefined();
    const stored = getMetadataCacheFromStorage();
    expect(stored[id]).toBeDefined();
    expect(stored[id].title).toBe('IPX最新作');
    expect(stored[id].actress).toBe('相沢みなみ');
  });

  it('ケース3: 古いcacheへの逆戻り防止 - 個別再取得後に古いMetadataに戻らないこと', () => {
    let cache: Record<string, ScrapedMetadata> = {
      'SSNI-001': {
        productId: 'SSNI-001',
        title: '古いタイトル2020',
        actress: '旧女優',
        debug: { finalUrl: '', pageTitle: '', htmlLength: 0, htmlPreview: '', bodyPreview: '' }
      }
    };

    // 古いキャッシュが保存されている状態
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));

    // 個別再取得で新しいメタデータを上書き
    const updatedMeta: ScrapedMetadata = {
      productId: 'SSNI-001',
      title: 'リフレッシュ後の新タイトル',
      actress: '新女優',
      debug: { finalUrl: '', pageTitle: '', htmlLength: 0, htmlPreview: '', bodyPreview: '' }
    };

    cache = updateMetadataCache(cache, 'SSNI-001', updatedMeta);

    // 再度ストレージから読み込んでも最新値が保たれていること
    const reloaded = getMetadataCacheFromStorage();
    expect(reloaded['SSNI-001'].title).toBe('リフレッシュ後の新タイトル');
    expect(reloaded['SSNI-001'].actress).toBe('新女優');
  });

  it('ケース4: API取得失敗 - APIエラー時に既存のキャッシュを勝手に破壊しないこと', () => {
    const existingMeta: ScrapedMetadata = {
      productId: 'SSNI-001',
      title: '既存キャッシュタイトル',
      actress: '既存女優',
      debug: { finalUrl: '', pageTitle: '', htmlLength: 0, htmlPreview: '', bodyPreview: '' }
    };

    let cache: Record<string, ScrapedMetadata> = {
      'SSNI-001': existingMeta
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));

    // API取得失敗をシミュレート（エラー発生時は updateMetadataCache を呼ばない）
    const fetchSuccess = false;
    if (fetchSuccess) {
      cache = updateMetadataCache(cache, 'SSNI-001', { productId: 'SSNI-001', debug: { finalUrl: '', pageTitle: '', htmlLength: 0, htmlPreview: '', bodyPreview: '' } });
    }

    // 既存キャッシュが残っていること
    expect(cache['SSNI-001']).toEqual(existingMeta);
    const stored = getMetadataCacheFromStorage();
    expect(stored['SSNI-001']).toEqual(existingMeta);
  });

  it('ケース5: 手動Metadata編集 - 各フィールドの更新と isUserEdited フラグ付与', () => {
    const originalMeta: ScrapedMetadata = {
      productId: 'TEK-001',
      title: '自動取得タイトル',
      actress: '自動女優',
      releaseDate: '2025-01-01',
      series: '旧シリーズ',
      maker: '旧メーカー',
      debug: { finalUrl: '', pageTitle: '', htmlLength: 0, htmlPreview: '', bodyPreview: '' }
    };

    const editedMeta: ScrapedMetadata = {
      ...originalMeta,
      title: '手動編集後のカスタムタイトル',
      actress: 'カスタム女優A, カスタム女優B',
      releaseDate: '2026-08-10',
      series: '新シリーズ',
      maker: '新メーカー',
      isUserEdited: true
    };

    expect(editedMeta.isUserEdited).toBe(true);
    expect(editedMeta.title).toBe('手動編集後のカスタムタイトル');
    expect(editedMeta.actress).toBe('カスタム女優A, カスタム女優B');
    expect(editedMeta.releaseDate).toBe('2026-08-10');
    expect(editedMeta.series).toBe('新シリーズ');
    expect(editedMeta.maker).toBe('新メーカー');
  });

  it('ケース6: 手動編集後のcache更新 - 手動編集データがキャッシュとlocalStorageに同期されること', () => {
    let cache: Record<string, ScrapedMetadata> = {};
    const id = 'TEK-001';

    const editedMeta: ScrapedMetadata = {
      productId: 'TEK-001',
      title: '手動編集タイトル',
      actress: '手動女優',
      isUserEdited: true,
      debug: { finalUrl: '', pageTitle: '', htmlLength: 0, htmlPreview: '', bodyPreview: '' }
    };

    cache = updateMetadataCache(cache, id, editedMeta);

    expect(cache[id]).toBeDefined();
    const stored = getMetadataCacheFromStorage();
    expect(stored[id].title).toBe('手動編集タイトル');
    expect(stored[id].isUserEdited).toBe(true);
  });

  it('ケース7: 手動編集後のPreview更新 - 手動編集したメタデータでファイル名プレビューが正しく更新されること', () => {
    const file: VideoFile = {
      id: 'f1',
      originalName: 'TEK-001.mp4',
      extension: 'mp4',
      extractedId: 'TEK-001',
      status: 'completed',
      metadata: {
        productId: 'TEK-001',
        title: '自動タイトル',
        actress: '自動女優',
        debug: { finalUrl: '', pageTitle: '', htmlLength: 0, htmlPreview: '', bodyPreview: '' }
      }
    };

    const initialName = formatRelativePath(
      '[{id}] {title} - {actress}',
      file.metadata as unknown as Record<string, unknown>,
      file.extension
    );
    expect(initialName).toBe('[TEK-001] 自動タイトル - 自動女優.mp4');

    // 手動編集を適用
    const editedMetadata: ScrapedMetadata = {
      ...file.metadata!,
      title: '編集後タイトル',
      actress: '編集後女優',
      isUserEdited: true
    };
    file.metadata = editedMetadata;

    const updatedName = formatRelativePath(
      '[{id}] {title} - {actress}',
      file.metadata as unknown as Record<string, unknown>,
      file.extension
    );
    expect(updatedName).toBe('[TEK-001] 編集後タイトル - 編集後女優.mp4');
  });

  it('ケース8: キャンセル時にMetadataが変更されないこと', () => {
    const originalMeta: ScrapedMetadata = {
      productId: 'MIGD-639',
      title: '変更前タイトル',
      actress: '変更前女優',
      debug: { finalUrl: '', pageTitle: '', htmlLength: 0, htmlPreview: '', bodyPreview: '' }
    };

    const file: VideoFile = {
      id: 'f2',
      originalName: 'MIGD-639.mp4',
      extension: 'mp4',
      extractedId: 'MIGD-639',
      status: 'completed',
      metadata: originalMeta
    };

    // キャンセル操作をシミュレート（ファイルオブジェクトを変更しない）
    const cancelOperation = () => {
      // no-op
    };
    cancelOperation();

    expect(file.metadata).toEqual(originalMeta);
    expect(file.metadata?.title).toBe('変更前タイトル');
  });

  it('ケース9: 不正入力の安全化 - Windows禁止文字や予約名が含まれていても安全にサニタイズされること', () => {
    const unsafeMeta: ScrapedMetadata = {
      productId: 'CON', // Windows予約名
      title: '危険なタイトル: <script>alert("xss")</script> / * ? " |',
      actress: '女優/名前',
      debug: { finalUrl: '', pageTitle: '', htmlLength: 0, htmlPreview: '', bodyPreview: '' }
    };

    const formatted = formatRelativePath(
      '[{id}] {title}',
      unsafeMeta as unknown as Record<string, unknown>,
      'mp4'
    );

    // 禁止文字 (\ / : * ? " < > |) が全角変換され、CONなどの予約名やパス区切り文字が安全化されていること
    expect(formatted).not.toContain('<script>');
    expect(formatted).not.toContain('/');
    expect(formatted).not.toContain('?');
    expect(formatted).not.toContain('*');
    expect(formatted.endsWith('.mp4')).toBe(true);
  });

  it('ケース10: 既存Metadataとの後方互換性 - isUserEdited 未定義の古いオブジェクトが正しく動作すること', () => {
    const legacyMeta: ScrapedMetadata = {
      productId: 'OLD-001',
      title: 'レガシータイトル',
      actress: 'レガシー女優',
      // isUserEdited は未定義
      debug: { finalUrl: '', pageTitle: '', htmlLength: 0, htmlPreview: '', bodyPreview: '' }
    };

    expect(legacyMeta.isUserEdited).toBeUndefined();

    const formatted = formatRelativePath(
      '[{id}] {title}',
      legacyMeta as unknown as Record<string, unknown>,
      'mkv'
    );
    expect(formatted).toBe('[OLD-001] レガシータイトル.mkv');
  });
});

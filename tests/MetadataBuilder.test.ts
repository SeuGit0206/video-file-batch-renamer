import { describe, it, expect } from 'vitest';
import { MetadataBuilder } from '../src/builders/MetadataBuilder';
import type { DocumentInfo } from '../src/types';

describe('MetadataBuilder', () => {
  const builder = new MetadataBuilder();

  it('正常生成: 全フィールドが渡された場合に正しく ScrapedMetadata DTO を構築する', () => {
    const docInfo: DocumentInfo = {
      title: 'サンプル作品タイトル',
      h1: 'サンプル H1',
      titleDom: 'サンプル TitleDOM',
      canonical: 'https://missav.ai/ja/abc-123',
      description: '説明文',
      actresses: '山田花子',
      maker: 'サンプルメーカー',
    };

    const metadata = builder.build({
      productId: 'ABC-123',
      title: 'クリーニング済みタイトル ABC-123',
      actress: '山田花子',
      releaseDate: '2026-01-01',
      series: 'MissAV',
      maker: 'サンプルメーカー',
      thumbnail: 'https://example.com/thumb.jpg',
      detailUrl: 'https://missav.ai/ja/abc-123',
      source: 'MissAV',
      docInfo,
      debug: {
        finalUrl: 'https://missav.ai/ja/abc-123',
        pageTitle: 'サンプル作品タイトル',
        htmlLength: 5000,
        htmlPreview: '<html>...</html>',
        bodyPreview: 'ボディテキスト',
        status: 200,
      },
    });

    expect(metadata.productId).toBe('ABC-123');
    expect(metadata.title).toBe('クリーニング済みタイトル ABC-123');
    expect(metadata.actress).toBe('山田花子');
    expect(metadata.releaseDate).toBe('2026-01-01');
    expect(metadata.series).toBe('MissAV');
    expect(metadata.maker).toBe('サンプルメーカー');
    expect(metadata.thumbnail).toBe('https://example.com/thumb.jpg');
    expect(metadata.detailUrl).toBe('https://missav.ai/ja/abc-123');
    expect(metadata.source).toBe('MissAV');
    expect(metadata.debug.finalUrl).toBe('https://missav.ai/ja/abc-123');
    expect(metadata.debug.status).toBe(200);
  });

  it('docInfo と rawTitle からのタイトル・女優・メーカーの自動抽出とデフォルト値の自動補完', () => {
    const docInfo: DocumentInfo = {
      title: '生タイトル ABC-123 - MissAV',
      h1: '生タイトル H1 ABC-123',
      titleDom: '',
      canonical: '',
      description: '',
      actresses: '佐藤美咲',
      maker: 'アイデアポケット',
    };

    const metadata = builder.build({
      productId: 'ABC-123',
      docInfo,
      html: '<div>発売日: 2025/12/25</div>',
    });

    expect(metadata.productId).toBe('ABC-123');
    expect(metadata.title).toBe('生タイトル');
    expect(metadata.actress).toBe('佐藤美咲');
    expect(metadata.releaseDate).toBe('2025-12-25');
    expect(metadata.series).toBe('MissAV');
    expect(metadata.maker).toBe('アイデアポケット');
    expect(metadata.debug.finalUrl).toBe('');
    expect(metadata.debug.htmlLength).toBe(26);
  });

  it('null値 / undefined値 / 空文字入力の吸収と安全な処理', () => {
    const metadata = builder.build({
      productId: '   XYZ-999  ',
      title: null,
      rawTitle: null,
      actress: null,
      releaseDate: null,
      series: null,
      maker: null,
      thumbnail: null,
      detailUrl: null,
      source: null,
      docInfo: null,
      html: null,
      debug: null,
    });

    expect(metadata.productId).toBe('XYZ-999');
    expect(metadata.title).toBeUndefined();
    expect(metadata.actress).toBeUndefined();
    expect(metadata.releaseDate).toBeUndefined();
    expect(metadata.series).toBe('MissAV');
    expect(metadata.maker).toBeUndefined();
    expect(metadata.debug).toBeDefined();
    expect(metadata.debug.finalUrl).toBe('');
    expect(metadata.debug.htmlLength).toBe(0);
    expect(metadata.debug.htmlPreview).toBe('');
  });

  it('status や error が指定された NotFound / エラー時の DTO 構築', () => {
    const metadata = builder.build({
      productId: 'ERR-404',
      status: 'NotFound',
      error: 'MissAVに作品が存在しません',
      debug: {
        status: 404,
        finalUrl: 'https://missav.ai/ja/search/err-404',
      },
    });

    expect(metadata.productId).toBe('ERR-404');
    expect(metadata.status).toBe('NotFound');
    expect(metadata.error).toBe('MissAVに作品が存在しません');
    expect(metadata.series).toBeUndefined();
    expect(metadata.debug.status).toBe(404);
    expect(metadata.debug.finalUrl).toBe('https://missav.ai/ja/search/err-404');
  });

  it('debug 情報のデフォルト値完全補完テスト', () => {
    const metadata = builder.build({
      productId: 'DBG-001',
      debug: {
        cloudflareReasons: ['Turnstile found'],
      },
    });

    expect(metadata.debug.cloudflareReasons).toEqual(['Turnstile found']);
    expect(metadata.debug.matchedSelectors).toBeUndefined();
    expect(metadata.debug.status).toBeUndefined();
    expect(metadata.debug.finalUrl).toBe('');
    expect(metadata.debug.pageTitle).toBe('');
  });
});

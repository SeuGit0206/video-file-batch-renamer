import { describe, it, expect } from 'vitest';
import { MissAvMetadataExtractor } from '../src/extractors/MissAvMetadataExtractor';
import { ScrapingContext } from '../src/steps/ScrapingContext';

describe('MissAvMetadataExtractor Test Suite', () => {
  it('ScrapingContext から正確にメタデータ抽出情報を解析・返却できること', () => {
    const extractor = new MissAvMetadataExtractor();
    const ctx = new ScrapingContext('ssis-001', 'https://missav.ai/ja');

    ctx.html = `
      <html>
        <head>
          <title>SSIS-001 豪華共演タイトル - MissAV</title>
        </head>
        <body>
          <div>発売日: 2026-05-20</div>
        </body>
      </html>
    `;
    ctx.docInfo = {
      title: 'SSIS-001 豪華共演タイトル - MissAV',
      h1: 'SSIS-001 豪華共演タイトル',
      canonical: 'https://missav.ai/ja/ssis-001',
      description: '説明文',
      titleDom: '',
      actresses: '三上悠亜',
      maker: 'S1 NO.1 STYLE'
    };

    const result = extractor.extract(ctx);

    expect(result.finalProductId).toBe('SSIS-001');
    expect(result.title).toBe('豪華共演タイトル');
    expect(result.actress).toBe('三上悠亜');
    expect(result.series).toBe('MissAV');
    expect(result.maker).toBe('S1 NO.1 STYLE');
    expect(result.releaseDate).toBe('2026-05-20');
    expect(result.bodyContainsProductId).toBe(true);
  });
});

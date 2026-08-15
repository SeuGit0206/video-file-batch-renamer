import { describe, it, expect } from 'vitest';
import { HtmlParserService } from '../src/parsers/HtmlParserService';
import type { DocumentInfo } from '../src/types';

describe('HtmlParserService', () => {
  describe('cleanTitle()', () => {
    it('空文字やnull相当が渡された場合は空文字列を返す', () => {
      expect(HtmlParserService.cleanTitle('')).toBe('');
    });

    it('改行・タブ・全角スペース・連続スペースを正規化する', () => {
      const input = '  タイトル\r\n\tテスト　サンプル   データ  ';
      expect(HtmlParserService.cleanTitle(input)).toBe('タイトル テスト サンプル データ');
    });

    it('不要なPRキーワードやMissAVサフィックスを除去する', () => {
      const input = '豪華共演作品 - MissAV.ai | オンラインで無料 高画質 日本語字幕';
      expect(HtmlParserService.cleanTitle(input)).toBe('豪華共演作品');
    });

    it('タイトルに含まれる品番（ハイフンあり・なし）を除去する', () => {
      const input = 'SODE-123 衝撃のデビュー作 SODE123';
      expect(HtmlParserService.cleanTitle(input, 'SODE-123')).toBe('衝撃のデビュー作');
    });

    it('宣伝用タグ括弧【】［］[]（無修正、高画質、字幕など）を除去する', () => {
      const input = '【無修正】［高画質］[4K] 最高の作品【独占配信】';
      expect(HtmlParserService.cleanTitle(input)).toBe('最高の作品');
    });

    it('ノイズのみの場合はクレンジング後に空文字となる', () => {
      const input = '【無修正】 - MissAV | オンラインで無料';
      expect(HtmlParserService.cleanTitle(input)).toBe('');
    });
  });

  describe('extractReleaseDate()', () => {
    it('「配信開始日」キーワードから yyyy-mm-dd 形式の日付を抽出する', () => {
      const html = '<div><span>配信開始日: 2024-05-15</span></div>';
      expect(HtmlParserService.extractReleaseDate(html)).toBe('2024-05-15');
    });

    it('「発売日」キーワードから yyyy/mm/dd 形式の日付を抽出してハイフン区切りに変換する', () => {
      const html = '<div>発売日 2023/12/25</div>';
      expect(HtmlParserService.extractReleaseDate(html)).toBe('2023-12-25');
    });

    it('「Release Date」や「商品発売日」キーワードからも正確に日付を抽出する', () => {
      const html1 = '<p>Release Date 2022-01-01</p>';
      const html2 = '<p>商品発売日: 2021/08/10</p>';
      expect(HtmlParserService.extractReleaseDate(html1)).toBe('2022-01-01');
      expect(HtmlParserService.extractReleaseDate(html2)).toBe('2021-08-10');
    });

    it('日付が含まれない場合や不正フォーマットの場合は本日の日付(YYYY-MM-DD)を返す', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(HtmlParserService.extractReleaseDate('日付情報なし')).toBe(today);
      expect(HtmlParserService.extractReleaseDate('')).toBe(today);
    });
  });

  describe('extractProductId()', () => {
    it('canonical URL から品番を抽出する', () => {
      const docInfo: Partial<DocumentInfo> = {
        canonical: 'https://missav.ai/ja/abcd-123',
      };
      const result = HtmlParserService.extractProductId(docInfo, 'ABCD-123');
      expect(result.selector1).toBe('abcd-123');
      expect(result.finalProductId).toBe('ABCD-123');
    });

    it('h1 テキストから品番を抽出する', () => {
      const docInfo: Partial<DocumentInfo> = {
        h1: 'ABCD-456 豪華女優出演作品',
      };
      const result = HtmlParserService.extractProductId(docInfo, 'ABCD-456');
      expect(result.selector2).toBe('ABCD-456');
      expect(result.finalProductId).toBe('ABCD-456');
    });

    it('title から品番を抽出する', () => {
      const docInfo: Partial<DocumentInfo> = {
        title: 'WXYZ-789 新作タイトル',
      };
      const result = HtmlParserService.extractProductId(docInfo, 'WXYZ-789');
      expect(result.regex1).toBe('WXYZ-789');
      expect(result.finalProductId).toBe('WXYZ-789');
    });

    it('description から品番を抽出する', () => {
      const docInfo: Partial<DocumentInfo> = {
        description: '作品詳細情報 XYZ-9999 のページです',
      };
      const result = HtmlParserService.extractProductId(docInfo, 'XYZ-9999');
      expect(result.regex2).toBe('XYZ-9999');
      expect(result.finalProductId).toBe('XYZ-9999');
    });

    it('小文字やハイフン表記の違いがあっても期待する品番(cleanId)にマッチすれば大文字品番を返す', () => {
      const docInfo: Partial<DocumentInfo> = {
        canonical: 'https://missav.ai/ja/sode-001',
      };
      const result = HtmlParserService.extractProductId(docInfo, 'SODE-001');
      expect(result.finalProductId).toBe('SODE-001');
    });

    it('要素内に品番が見つからないが title/h1 に cleanId が含まれる場合フォールバックする', () => {
      const docInfo: Partial<DocumentInfo> = {
        title: 'SPECIAL-TITLE-ABC123',
      };
      const result = HtmlParserService.extractProductId(docInfo, 'ABC123');
      expect(result.finalProductId).toBe('ABC123');
    });
  });

  describe('parseHtmlDiagnostics()', () => {
    it('JSON-LD, __NEXT_DATA__, video, space-y-2 の有無を正確にカウント・判定する', () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">{"@type":"VideoObject"}</script>
            <script type="application/ld+json">{"@type":"Movie"}</script>
          </head>
          <body>
            <script id="__NEXT_DATA__">{}</script>
            <video src="video.mp4"></video>
            <div class="space-y-2"></div>
          </body>
        </html>
      `;
      const diag = HtmlParserService.parseHtmlDiagnostics(html);
      expect(diag.ldJsonCount).toBe(2);
      expect(diag.hasLdJson).toBe(true);
      expect(diag.hasNextData).toBe(true);
      expect(diag.hasVideo).toBe(true);
      expect(diag.hasSpaceY2).toBe(true);
    });

    it('構造化要素が存在しない HTML の判定がすべて false / 0 になる', () => {
      const html = '<html><body><div>simple text</div></body></html>';
      const diag = HtmlParserService.parseHtmlDiagnostics(html);
      expect(diag.ldJsonCount).toBe(0);
      expect(diag.hasLdJson).toBe(false);
      expect(diag.hasNextData).toBe(false);
      expect(diag.hasVideo).toBe(false);
      expect(diag.hasSpaceY2).toBe(false);
    });
  });

  describe('extractJsonLdData()', () => {
    it('VideoObject からタイトルと出演者(actor: 配列/オブジェクト/文字列)を抽出する', () => {
      const html = `
        <script type="application/ld+json">
        {
          "@type": "VideoObject",
          "name": "サンプル動画タイトル",
          "actor": [
            { "@type": "Person", "name": "女優A" },
            { "@type": "Person", "name": "女優B" },
            "女優C"
          ]
        }
        </script>
      `;
      const res = HtmlParserService.extractJsonLdData(html);
      expect(res.title).toBe('サンプル動画タイトル');
      expect(res.actresses).toEqual(['女優A', '女優B', '女優C']);
    });

    it('Movie タイプおよび単一オブジェクトの actor を正しくパースする', () => {
      const html = `
        <script type="application/ld+json">
        {
          "@type": "Movie",
          "name": "映画タイトル",
          "actor": { "@type": "Person", "name": "主演女優" }
        }
        </script>
      `;
      const res = HtmlParserService.extractJsonLdData(html);
      expect(res.title).toBe('映画タイトル');
      expect(res.actresses).toEqual(['主演女優']);
    });

    it('JSON-LDが配列形式で複数指定されている場合もパースできる', () => {
      const html = `
        <script type="application/ld+json">
        [
          { "@type": "WebSite", "url": "https://missav.ai" },
          { "@type": "VideoObject", "name": "配列内タイトル", "actor": ["女優D"] }
        ]
        </script>
      `;
      const res = HtmlParserService.extractJsonLdData(html);
      expect(res.title).toBe('配列内タイトル');
      expect(res.actresses).toEqual(['女優D']);
    });

    it('JSONが破損している場合やscriptが存在しない場合はエラーを起こさず空の結果を返す', () => {
      const html1 = '<script type="application/ld+json">{ broken json </script>';
      const html2 = '<div>No JSON-LD</div>';
      expect(HtmlParserService.extractJsonLdData(html1)).toEqual({ title: '', actresses: [] });
      expect(HtmlParserService.extractJsonLdData(html2)).toEqual({ title: '', actresses: [] });
    });
  });

  describe('validateDetailPage()', () => {
    const dummyDocInfo: DocumentInfo = {
      title: 'IPX-123 判定テスト',
      h1: 'IPX-123 作品詳細',
      canonical: 'https://missav.ai/ja/ipx-123',
      actresses: '女優名',
      description: '作品情報',
      titleDom: 'IPX-123',
      maker: 'メーカー名',
    };
    const dummyValidHtml = '<script type="application/ld+json"></script><video></video><div class="space-y-2"></div>';

    it('正常な詳細ページの場合は isInvalid: false を返す', () => {
      const res = HtmlParserService.validateDetailPage(
        dummyDocInfo,
        dummyValidHtml,
        200,
        'https://missav.ai/ja/ipx-123',
        true
      );
      expect(res.isInvalid).toBe(false);
      expect(res.reason).toBe('Detail page is valid');
    });

    it('VIPリダイレクト URL の場合は無効判定になる', () => {
      const res = HtmlParserService.validateDetailPage(
        dummyDocInfo,
        dummyValidHtml,
        200,
        'https://missav.ai/ja/vip',
        true
      );
      expect(res.isInvalid).toBe(true);
      expect(res.reason).toContain('VIP');
    });

    it('H1が「見つかりません」や「Not Found」の場合は無効判定になる', () => {
      const notFoundDocInfo = { ...dummyDocInfo, h1: 'ページが見つかりません (Not Found)' };
      const res = HtmlParserService.validateDetailPage(
        notFoundDocInfo,
        dummyValidHtml,
        200,
        'https://missav.ai/ja/ipx-123',
        true
      );
      expect(res.isInvalid).toBe(true);
      expect(res.reason).toContain('H1 indicates Not Found');
    });

    it('HTTP ステータスが 404 の場合は無効判定になる', () => {
      const res = HtmlParserService.validateDetailPage(
        dummyDocInfo,
        dummyValidHtml,
        404,
        'https://missav.ai/ja/ipx-123',
        true
      );
      expect(res.isInvalid).toBe(true);
      expect(res.reason).toContain('404');
    });

    it('hasPageInstance が false (Cloudflareバイパス失敗など) の場合は無効判定になる', () => {
      const res = HtmlParserService.validateDetailPage(
        dummyDocInfo,
        dummyValidHtml,
        200,
        'https://missav.ai/ja/ipx-123',
        false
      );
      expect(res.isInvalid).toBe(true);
      expect(res.reason).toContain('Page instance is null');
    });

    it('必須要素（JSON-LD, video, space-y-2）がすべて欠落している場合は無効判定になる', () => {
      const emptyHtml = '<div>empty element</div>';
      const res = HtmlParserService.validateDetailPage(
        dummyDocInfo,
        emptyHtml,
        200,
        'https://missav.ai/ja/ipx-123',
        true
      );
      expect(res.isInvalid).toBe(true);
      expect(res.reason).toContain('Essential elements');
    });
  });

  describe('matchSearchCandidateUrl()', () => {
    const candidates = [
      'https://missav.ai/ja/ssis-001',
      'https://missav.ai/ja/fc2-ppv-123456',
      'https://missav.ai/ja/sode-999-uncensored',
    ];

    it('候補が空配列の場合は null を返す', () => {
      expect(HtmlParserService.matchSearchCandidateUrl([], 'SSIS-001')).toBeNull();
    });

    it('Rule A: 完全正規化一致 (ハイフン・記号無視の完全一致)', () => {
      const match = HtmlParserService.matchSearchCandidateUrl(candidates, 'FC2PPV123456');
      expect(match).toBe('https://missav.ai/ja/fc2-ppv-123456');
    });

    it('Rule B: 部分一致 (正規化文字列の部分一致)', () => {
      const match = HtmlParserService.matchSearchCandidateUrl(candidates, 'SSIS001');
      expect(match).toBe('https://missav.ai/ja/ssis-001');
    });

    it('Rule C: マルチパート一致 (ハイフン区切りの各パーツがすべて含まれる)', () => {
      const match = HtmlParserService.matchSearchCandidateUrl(candidates, 'SODE-999');
      expect(match).toBe('https://missav.ai/ja/sode-999-uncensored');
    });

    it('Rule D: 一致しない場合は先頭の候補(フォールバック)を返す', () => {
      const match = HtmlParserService.matchSearchCandidateUrl(candidates, 'UNKNOWN-999');
      expect(match).toBe('https://missav.ai/ja/ssis-001');
    });
  });

  describe('assembleMetadata()', () => {
    it('入力パラメータから正確な ScrapedMetadata オブジェクトを組み立てる', () => {
      const docInfo: DocumentInfo = {
        title: 'SODE-123 新作タイトル - MissAV',
        h1: 'SODE-123 新作タイトル',
        canonical: 'https://missav.ai/ja/sode-123',
        actresses: '人気女優A',
        description: '詳細説明',
        titleDom: 'SODE-123 新作タイトル',
        maker: 'SODE',
      };
      const html = '<div>配信開始日: 2024-06-01</div>';

      const metadata = HtmlParserService.assembleMetadata({
        docInfo,
        html,
        cleanId: 'SODE-123',
        pageTitle: 'SODE-123 新作タイトル - MissAV',
      });

      expect(metadata).toEqual({
        productId: 'SODE-123',
        title: '新作タイトル',
        actress: '人気女優A',
        releaseDate: '2024-06-01',
        series: 'MissAV',
      });
    });

    it('docInfoの各要素が空や欠落していても安全にデフォルト値で組み立てる', () => {
      const docInfo: DocumentInfo = {
        title: 'ABC-999',
        h1: '',
        canonical: '',
        actresses: '',
        description: '',
        titleDom: '',
        maker: '',
      };
      const today = new Date().toISOString().split('T')[0];

      const metadata = HtmlParserService.assembleMetadata({
        docInfo,
        html: '',
        cleanId: 'ABC-999',
        pageTitle: '',
      });

      expect(metadata.productId).toBe('ABC-999');
      expect(metadata.title).toBe('');
      expect(metadata.actress).toBe('');
      expect(metadata.releaseDate).toBe(today);
      expect(metadata.series).toBe('MissAV');
    });
  });
});

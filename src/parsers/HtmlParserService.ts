import type { DocumentInfo } from '../types';

export interface ProductIdExtractionResult {
  finalProductId: string;
  selector1: string;
  selector2: string;
  regex1: string;
  regex2: string;
}

export interface HtmlDiagnosticsResult {
  ldJsonCount: number;
  hasLdJson: boolean;
  hasNextData: boolean;
  hasVideo: boolean;
  hasSpaceY2: boolean;
}

export interface DetailPageValidationResult {
  isInvalid: boolean;
  reason: string;
}

export interface JsonLdExtractionResult {
  title: string;
  actresses: string[];
}

export class HtmlParserService {
  /**
   * タイトルのクレンジング・正規化処理を行う純粋関数
   */
  public static cleanTitle(rawTitle: string, productId?: string): string {
    if (!rawTitle) return '';

    let title = rawTitle;

    // a. 制御文字、タブ、改行、全角スペースの正規化
    title = title.replace(/[\r\n\t]/g, ' ');
    title = title.replace(/　/g, ' ');

    // b. 不要なサフィックスやPRキーワードの削除
    const unwantedPatterns = [
      /\s*[|#-]\s*(?:MissAV|オンラインで無料|無料|High Quality|Subbed|日本語字幕|AV女優一覧|AV女優|無料動画|高画質|オンライン視聴).*$/gi,
      /- MissAV\.ai/gi,
      /\| MissAV\.ai/gi,
      /- MissAV/gi,
      /\| MissAV/gi,
      /無料動画/g,
      /高画質/g,
      /オンライン視聴/g,
      /日本語字幕/g,
      /AV女優一覧/g,
      /無料/g,
      /オンラインで無料/g,
      /High Quality/gi,
      /Subbed/gi,
    ];
    for (const pat of unwantedPatterns) {
      title = title.replace(pat, '');
    }

    // c. 品番がタイトルに含まれている場合の重複削除
    if (productId && productId.trim() !== '') {
      const id = productId.trim().toUpperCase();
      const idNoHyphen = id.replace(/-/g, '');
      title = title.replace(new RegExp(`\\b${id}\\b|\\b${idNoHyphen}\\b`, 'gi'), '');
      title = title.replace(new RegExp(id, 'gi'), '');
      title = title.replace(new RegExp(idNoHyphen, 'gi'), '');
    }

    // d. 括弧および括弧内の宣伝タグ等の削除
    const unwantedInBrackets = /(?:【|\[|\()(?:無修正|高画質|字幕|4K|フルHD|先行配信|独占|VR|ハイレゾ|無料|プレビュー|サンプル|配信|日本語字幕|画質|HD|SD|HQ|SUB)(?:】|\]|\))/gi;
    title = title.replace(unwantedInBrackets, '');

    // 宣伝用【】括弧の完全削除
    title = title.replace(/【[^】]*】/g, '');
    title = title.replace(/\[[^\]]*\]/g, '');
    title = title.replace(/［[^］]*］/g, '');

    // 残った空括弧の削除
    title = title.replace(/\(\s*\)/g, '');
    title = title.replace(/（\s*）/g, '');

    // e. スペース重複排除・記号トリム
    title = title.replace(/\s+/g, ' ');
    title = title.replace(/^[\s\-_|+#/\\]+|[\s\-_|+#/\\]+$/g, '');
    return title.trim();
  }

  /**
   * HTML文字列から配信/発売日を抽出する
   */
  public static extractReleaseDate(html: string): string {
    if (html) {
      const releaseDateRegex = /(?:配信開始日|発売日|Release\s*Date|商品発売日)[\s\S]{0,100}(\d{4}[-/]\d{2}[-/]\d{2})/i;
      const dateMatch = html.match(releaseDateRegex);
      if (dateMatch) {
        return dateMatch[1].replace(/\//g, '-');
      }
    }
    return new Date().toISOString().split('T')[0];
  }

  /**
   * DocumentInfoおよび期待される品番から最終的な品番を抽出する
   */
  public static extractProductId(
    docInfo: Partial<DocumentInfo>,
    cleanId: string
  ): ProductIdExtractionResult {
    let selector1 = '';
    if (docInfo.canonical) {
      const canonicalParts = docInfo.canonical.split('/');
      selector1 = canonicalParts[canonicalParts.length - 1] || '';
    }

    let selector2 = '';
    if (docInfo.h1) {
      const javRegex = /([a-zA-Z]{2,8})-([0-9]{3,5})/i;
      const match = docInfo.h1.match(javRegex);
      if (match) {
        selector2 = match[0];
      }
    }

    let regex1 = '';
    if (docInfo.title) {
      const javRegex = /([a-zA-Z]{2,8})-([0-9]{3,5})/i;
      const match = docInfo.title.match(javRegex);
      if (match) {
        regex1 = match[0];
      }
    }

    let regex2 = '';
    if (docInfo.description) {
      const javRegex = /([a-zA-Z]{2,8})-([0-9]{3,5})/i;
      const match = docInfo.description.match(javRegex);
      if (match) {
        regex2 = match[0];
      }
    }

    let finalProductId = '';
    const candidate = (selector1 || selector2 || regex1 || regex2 || '').trim().toUpperCase();
    const cleanCandidate = candidate.replace(/[^A-Z0-9]/g, '');
    const cleanExpected = cleanId.replace(/[^A-Z0-9]/g, '');

    if (cleanCandidate && (cleanCandidate.includes(cleanExpected) || cleanExpected.includes(cleanCandidate))) {
      finalProductId = candidate;
    } else {
      const titleLower = (docInfo.title || '').toLowerCase();
      const h1Lower = (docInfo.h1 || '').toLowerCase();
      const idLower = cleanId.toLowerCase();
      if (titleLower.includes(idLower) || h1Lower.includes(idLower)) {
        finalProductId = cleanId;
      } else {
        finalProductId = candidate || '';
      }
    }

    return {
      finalProductId,
      selector1,
      selector2,
      regex1,
      regex2,
    };
  }

  /**
   * HTML文字列から JSON-LD 件数や構造化要素の有無を判定する
   */
  public static parseHtmlDiagnostics(html: string): HtmlDiagnosticsResult {
    const ldJsonRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let ldJsonCount = 0;
    while (ldJsonRegex.exec(html) !== null) {
      ldJsonCount++;
    }

    const lowerHtml = html.toLowerCase();
    const hasLdJson = ldJsonCount > 0 || lowerHtml.includes('application/ld+json');
    const hasNextData = html.includes('__NEXT_DATA__');
    const hasVideo = lowerHtml.includes('<video') || lowerHtml.includes('video');
    const hasSpaceY2 = lowerHtml.includes('space-y-2');

    return {
      ldJsonCount,
      hasLdJson,
      hasNextData,
      hasVideo,
      hasSpaceY2,
    };
  }

  /**
   * HTML内の JSON-LD スクリプトをパースしてタイトルと出演者を抽出する（純粋処理）
   */
  public static extractJsonLdData(html: string): JsonLdExtractionResult {
    let title = '';
    const actresses: string[] = [];

    const ldJsonRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = ldJsonRegex.exec(html)) !== null) {
      const content = match[1] || '';
      if (!content.trim()) continue;

      try {
        const data = JSON.parse(content);
        const objects = Array.isArray(data) ? data : [data];
        for (const obj of objects) {
          if (obj && (obj['@type'] === 'VideoObject' || obj['@type'] === 'Movie' || obj.name)) {
            if (obj.name && !title) {
              title = String(obj.name);
            }
            if (obj.actor) {
              const actors = Array.isArray(obj.actor) ? obj.actor : [obj.actor];
              for (const act of actors) {
                if (act && act.name) {
                  actresses.push(String(act.name));
                } else if (typeof act === 'string') {
                  actresses.push(act);
                }
              }
            }
          }
        }
      } catch {
        // パースエラーは無視
      }
    }

    return {
      title,
      actresses: Array.from(new Set(actresses)),
    };
  }

  /**
   * 詳細ページの有効性チェックを行う純粋関数
   */
  public static validateDetailPage(
    docInfo: DocumentInfo,
    html: string,
    status: number,
    finalUrl: string,
    hasPageInstance: boolean
  ): DetailPageValidationResult {
    const h1TextTrim = docInfo.h1 ? docInfo.h1.trim() : '';
    const isVipRedirect = finalUrl.includes('/vip');
    const h1IsNotFound =
      h1TextTrim === '見つかりません' ||
      h1TextTrim.toLowerCase().includes('not found') ||
      h1TextTrim.toLowerCase().includes('page not found');

    const diag = this.parseHtmlDiagnostics(html);

    const javRegex = /([a-zA-Z0-9]{2,10})-([0-9]{3,8})/i;
    const testSelector1 = docInfo.canonical ? docInfo.canonical.split('/').pop() || '' : '';
    const testSelector2 = docInfo.h1 ? docInfo.h1.match(javRegex)?.[0] || '' : '';
    const testRegex1 = docInfo.title ? docInfo.title.match(javRegex)?.[0] || '' : '';
    const testRegex2 = docInfo.description ? docInfo.description.match(javRegex)?.[0] || '' : '';
    const parsedProductId = (testSelector1 || testSelector2 || testRegex1 || testRegex2 || '').trim();

    const isInvalid =
      isVipRedirect ||
      h1IsNotFound ||
      (!diag.hasLdJson && !diag.hasVideo && !diag.hasSpaceY2) ||
      !parsedProductId ||
      status === 404 ||
      !hasPageInstance;

    let reason = 'Detail page is valid';
    if (isInvalid) {
      reason = isVipRedirect
        ? 'Redirected to VIP page'
        : h1IsNotFound
        ? 'H1 indicates Not Found ("見つかりません")'
        : status === 404
        ? 'HTTP Status is 404'
        : !hasPageInstance
        ? 'Page instance is null / Cloudflare bypass failed'
        : !diag.hasLdJson && !diag.hasVideo && !diag.hasSpaceY2
        ? 'Essential elements (JSON-LD, video, space-y-2) are missing'
        : !parsedProductId
        ? 'Failed to parse JAV product ID from canonical or H1'
        : 'Unknown validation failure';
    }

    return {
      isInvalid,
      reason,
    };
  }

  /**
   * 検索結果ページの candidates URL から目標の品番にマッチする URL を抽出する
   */
  public static matchSearchCandidateUrl(candidates: string[], cleanId: string): string | null {
    if (!candidates || candidates.length === 0) return null;

    const targetNorm = cleanId.toLowerCase().replace(/[-_]/g, '');

    // Rule A: 完全一致
    for (const href of candidates) {
      const urlParts = href.split('/');
      const lastSegment = (urlParts[urlParts.length - 1] || '').toLowerCase();
      const segmentNorm = lastSegment.replace(/[-_]/g, '');
      if (segmentNorm === targetNorm) {
        return href;
      }
    }

    // Rule B: 部分一致
    for (const href of candidates) {
      const urlParts = href.split('/');
      const lastSegment = (urlParts[urlParts.length - 1] || '').toLowerCase();
      const segmentNorm = lastSegment.replace(/[-_]/g, '');
      if (segmentNorm.includes(targetNorm) || targetNorm.includes(segmentNorm)) {
        return href;
      }
    }

    // Rule C: マルチパート分割一致
    const cleanIdParts = cleanId.toLowerCase().split(/[-_]/).filter((p) => p.length >= 2);
    for (const href of candidates) {
      const urlParts = href.split('/');
      const lastSegment = (urlParts[urlParts.length - 1] || '').toLowerCase();
      const isMatch = cleanIdParts.every((part) => lastSegment.includes(part));
      if (isMatch) {
        return href;
      }
    }

    // Rule D: フォールバック（候補の先頭）
    return candidates[0] || null;
  }

  /**
   * 抽出されたデータから最終的な ScrapedMetadata を組み立てる純粋関数
   */
  public static assembleMetadata(params: {
    docInfo: DocumentInfo;
    html: string;
    cleanId: string;
    pageTitle: string;
  }): { productId: string; title: string; actress: string; releaseDate: string; series: string } {
    const { docInfo, html, cleanId, pageTitle } = params;

    const idResult = this.extractProductId(docInfo, cleanId);
    const finalProductId = idResult.finalProductId;

    const rawTitle = docInfo.title || docInfo.h1 || docInfo.titleDom || pageTitle || '';
    const title = this.cleanTitle(rawTitle, finalProductId);
    const actress = docInfo.actresses || '';
    const releaseDate = this.extractReleaseDate(html);

    return {
      productId: finalProductId,
      title,
      actress,
      releaseDate,
      series: 'MissAV',
    };
  }
}

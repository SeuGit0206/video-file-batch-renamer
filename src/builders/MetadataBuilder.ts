import type { DocumentInfo, ScrapedMetadata, ScraperDebugInfo } from '../types';
import { HtmlParserService } from '../parsers';

/**
 * MetadataBuilder に渡すパラメータ
 */
export interface BuildMetadataParams {
  productId: string;
  title?: string | null;
  rawTitle?: string | null;
  actress?: string | null;
  releaseDate?: string | null;
  series?: string | null;
  maker?: string | null;
  thumbnail?: string | null;
  detailUrl?: string | null;
  source?: string | null;
  status?: string | null;
  error?: string | null;
  docInfo?: DocumentInfo | null;
  html?: string | null;
  debug?: Partial<ScraperDebugInfo> | null;
}

/**
 * ScrapedMetadata の構築を担うビルダーインターフェース
 */
export interface IMetadataBuilder {
  build(params: BuildMetadataParams): ScrapedMetadata;
}

/**
 * Parser 結果の統合、DTO 生成、デフォルト値補完を行うビルダー実装クラス
 */
export class MetadataBuilder implements IMetadataBuilder {
  public build(params: BuildMetadataParams): ScrapedMetadata {
    const productId = params.productId ? params.productId.trim() : '';

    // タイトル決定ロジック
    let title: string | undefined;
    if (params.title !== undefined && params.title !== null) {
      title = params.title;
    } else if (params.rawTitle) {
      title = HtmlParserService.cleanTitle(params.rawTitle.trim(), productId);
    } else if (params.docInfo) {
      const docRawTitle = (
        params.docInfo.title ||
        params.docInfo.h1 ||
        params.docInfo.titleDom ||
        ''
      ).trim();
      title = HtmlParserService.cleanTitle(docRawTitle, productId);
    }

    // 女優決定ロジック
    let actress: string | undefined;
    if (params.actress !== undefined && params.actress !== null) {
      actress = params.actress;
    } else if (params.docInfo?.actresses) {
      actress = params.docInfo.actresses;
    } else if (params.docInfo) {
      actress = '';
    }

    // 発売日決定ロジック
    let releaseDate: string | undefined;
    if (params.releaseDate !== undefined && params.releaseDate !== null) {
      releaseDate = params.releaseDate;
    } else if (params.html) {
      releaseDate = HtmlParserService.extractReleaseDate(params.html);
    }

    // シリーズ決定ロジック
    let series: string | undefined;
    if (params.series !== undefined && params.series !== null) {
      series = params.series;
    } else if (!params.status && !params.error) {
      series = 'MissAV';
    }

    // メーカー決定ロジック
    const maker = params.maker ?? params.docInfo?.maker ?? undefined;

    // debug 情報のデフォルト値補完
    const debugInput = params.debug || {};
    const debug: ScraperDebugInfo = {
      finalUrl: debugInput.finalUrl ?? '',
      pageTitle: debugInput.pageTitle ?? (params.docInfo?.title || ''),
      htmlLength: debugInput.htmlLength ?? (params.html ? params.html.length : 0),
      htmlPreview: debugInput.htmlPreview ?? (params.html ? params.html.substring(0, 1000) : ''),
      bodyPreview: debugInput.bodyPreview ?? '',
      titleTag: debugInput.titleTag,
      matchedSelectors: debugInput.matchedSelectors,
      unmatchedSelectors: debugInput.unmatchedSelectors,
      selectorResults: debugInput.selectorResults,
      ldJsonCount: debugInput.ldJsonCount,
      hasNextData: debugInput.hasNextData,
      hasLdJson: debugInput.hasLdJson,
      hasVideo: debugInput.hasVideo,
      status: debugInput.status,
      cloudflareReasons: debugInput.cloudflareReasons,
      searchFlowLogs: debugInput.searchFlowLogs,
      exceptionMessage: debugInput.exceptionMessage,
      exceptionStack: debugInput.exceptionStack,
    };

    const metadata: ScrapedMetadata = {
      productId,
      debug,
    };

    if (title !== undefined) {
      metadata.title = title;
    }
    if (actress !== undefined) {
      metadata.actress = actress;
    }
    if (releaseDate !== undefined) {
      metadata.releaseDate = releaseDate;
    }
    if (series !== undefined) {
      metadata.series = series;
    }
    if (maker !== undefined && maker !== '') {
      metadata.maker = maker;
    }
    if (params.thumbnail !== undefined && params.thumbnail !== null) {
      metadata.thumbnail = params.thumbnail;
    }
    if (params.detailUrl !== undefined && params.detailUrl !== null) {
      metadata.detailUrl = params.detailUrl;
    }
    if (params.source !== undefined && params.source !== null) {
      metadata.source = params.source;
    }
    if (params.status !== undefined && params.status !== null) {
      metadata.status = params.status;
    }
    if (params.error !== undefined && params.error !== null) {
      metadata.error = params.error;
    }

    return metadata;
  }
}

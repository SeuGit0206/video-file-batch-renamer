import type { IScrapingStep } from './IScrapingStep';
import type { ScrapingContext } from './ScrapingContext';
import type { ILogger } from '../services';
import { HtmlParserService } from '../parsers';
import type { IMetadataBuilder } from '../builders';
import { ScraperError } from '../errors';
import { AppErrorCode } from '../errors/AppErrorCodes';
import { HTTP_STATUS } from '../constants';
import type { IMetadataExtractor } from '../extractors/IMetadataExtractor';
import { MissAvMetadataExtractor } from '../extractors/MissAvMetadataExtractor';

export class MetadataParsingStep implements IScrapingStep {
  constructor(
    private logger: ILogger,
    private metadataBuilder: IMetadataBuilder,
    private extractor: IMetadataExtractor = new MissAvMetadataExtractor()
  ) {}

  public async execute(ctx: ScrapingContext): Promise<void> {
    if (ctx.earlyReturnResult) {
      ctx.metadata = ctx.earlyReturnResult;
      return;
    }

    const htmlDiag = HtmlParserService.parseHtmlDiagnostics(ctx.html);
    const ldJsonCount = htmlDiag.ldJsonCount;
    const hasLdJson = htmlDiag.hasLdJson;
    const hasNextData = htmlDiag.hasNextData;
    const hasVideo = htmlDiag.hasVideo;

    const cloudflareReasons: string[] = [];
    if (ctx.pageTitle.toLowerCase().includes('just a moment') || ctx.pageTitle.toLowerCase().includes('cloudflare')) {
      cloudflareReasons.push(`Title = ${ctx.pageTitle}`);
    }
    if (ctx.html.toLowerCase().includes('cf-turnstile') || ctx.html.toLowerCase().includes('turnstile') || ctx.html.includes('challenge-form') || ctx.html.includes('cf_challenge')) {
      cloudflareReasons.push('Turnstile found');
    }
    if (ctx.html.toLowerCase().includes('cf-challenge') || ctx.html.toLowerCase().includes('cf_challenge') || ctx.html.toLowerCase().includes('cloudflare-challenge')) {
      cloudflareReasons.push('cf-challenge detected');
    }
    if (ctx.status === 403) {
      cloudflareReasons.push('HTTP Status Code is 403');
    }

    this.logger.info(`\n================== SCRAPER DEBUG START (${ctx.cleanId}) ==================`);
    this.logger.info(`Status:\n${ctx.status}`);
    this.logger.info(`Response URL:\n${ctx.url}`);
    this.logger.info(`Final URL:\n${ctx.finalUrl}`);
    this.logger.info(`Page Title:\n${ctx.pageTitle}`);
    this.logger.info(`\nBody Preview:\n\n${ctx.bodyPreview}`);
    this.logger.info(`\nJSON-LD Found:\n${hasLdJson}`);
    this.logger.info(`Count:\n${ldJsonCount}`);
    this.logger.info('\nCSS Selectors tested:');

    const selectorsToTest = [
      'h1',
      'video',
      'a[href*="/actresses/"]',
      'a[href*="/series/"]',
      'script[type="application/ld+json"]',
      'script[id="__NEXT_DATA__"]',
      'div.space-y-2',
      'div.mt-4',
      'div.text-secondary',
      '.actor'
    ];

    for (const sel of selectorsToTest) {
      const res = ctx.selectorResults[sel] || { found: false, value: '' };
      this.logger.info(`Selector:\n${sel}`);
      this.logger.info(`Found:\n${res.found}`);
      if (res.found) {
        this.logger.info(`Value:\n${res.value}`);
      }
      this.logger.info('--------------------');
    }

    if (cloudflareReasons.length > 0) {
      this.logger.info('Cloudflare detected\n');
      for (const reason of cloudflareReasons) {
        this.logger.info(`Reason:\n${reason}`);
      }
    } else {
      this.logger.info('Cloudflare NOT detected');
    }

    if (ctx.exceptionMessage) {
      this.logger.error(`Exception.Message:\n${ctx.exceptionMessage}`);
      this.logger.error(`StackTrace:\n${ctx.exceptionStack}`);
    }
    this.logger.info(`================== SCRAPER DEBUG END (${ctx.cleanId}) ==================\n`);

    this.logger.info("★★★★ CHECKPOINT-3 ★★★★");

    if (ctx.status !== 200 || ctx.exceptionMessage) {
      const errMsg = ctx.exceptionMessage
        ? ctx.exceptionMessage.includes('CloudflareException') ? ctx.exceptionMessage : `Page interaction failed: ${ctx.exceptionMessage}`
        : ctx.status === 403
        ? `CloudflareException: Cloudflare blocked request (403 Forbidden). Challenge page might be active.`
        : ctx.status === 404
        ? `MissAV returned HTTP status 404. Page not found for product ID ${ctx.cleanId}.`
        : `MissAV returned HTTP status ${ctx.status}.`;

      throw new ScraperError(errMsg, {
        status: ctx.status,
        debug: {
          finalUrl: ctx.finalUrl,
          pageTitle: ctx.pageTitle,
          htmlLength: ctx.html.length,
          htmlPreview: ctx.html.substring(0, 1000),
          bodyPreview: ctx.bodyPreview,
          titleTag: ctx.titleTag,
          matchedSelectors: ctx.matchedSelectors,
          unmatchedSelectors: ctx.unmatchedSelectors,
          selectorResults: ctx.selectorResults,
          ldJsonCount,
          hasNextData,
          hasLdJson,
          hasVideo,
          status: ctx.status,
          cloudflareReasons,
          searchFlowLogs: ctx.searchFlowLogs,
          exceptionMessage: ctx.exceptionMessage,
          exceptionStack: ctx.exceptionStack
        }
      });
    }

    const extracted = this.extractor.extract(ctx);

    this.logger.info('\n=====================');
    this.logger.info('METADATA PARSE');
    this.logger.info('=====================');
    this.logger.info(`Title: ${ctx.docInfo.title}`);
    this.logger.info(`H1: ${ctx.docInfo.h1}`);
    this.logger.info(`Canonical: ${ctx.docInfo.canonical}`);
    this.logger.info(`Meta Description: ${ctx.docInfo.description}`);
    this.logger.info(`JSON-LD Count: ${ldJsonCount}`);
    this.logger.info(`Body contains ProductId: ${extracted.bodyContainsProductId}`);
    this.logger.info(`Regex Result: ${extracted.regex1 || extracted.regex2}`);
    this.logger.info(`Final ProductId: ${extracted.finalProductId}`);
    this.logger.info('=====================\n');

    this.logger.info('--- [ProductId取得ログ] ---');
    this.logger.info(`Selector1: ${extracted.selector1}`);
    this.logger.info(`Selector2: ${extracted.selector2}`);
    this.logger.info(`Regex1: ${extracted.regex1}`);
    this.logger.info(`Regex2: ${extracted.regex2}`);
    this.logger.info(`最終採用: ${extracted.finalProductId}`);
    this.logger.info('---------------------------\n');

    this.logger.info('--- [Metadata生成直前ログ] ---');
    this.logger.info(`ProductId: ${extracted.finalProductId}`);
    this.logger.info(`Title: ${extracted.title}`);
    this.logger.info(`Actress: ${extracted.actress}`);
    this.logger.info(`Series: ${extracted.series}`);
    this.logger.info(`Maker: ${extracted.maker}`);
    this.logger.info(`ReleaseDate: ${extracted.releaseDate}`);
    this.logger.info('------------------------------\n');

    if (!extracted.title) {
      this.logger.warn(`[Scraper Fail] Failed to extract product title. Title: "${extracted.title}", ReleaseDate: "${extracted.releaseDate}"`);
      this.logger.warn(`- URL: ${ctx.finalUrl}`);
      this.logger.info(`- Title tag: ${ctx.titleTag}`);
      this.logger.info(`- Body preview: ${ctx.bodyPreview}`);

      throw new ScraperError("Metadata extraction failed. Missing title from page.", {
        status: HTTP_STATUS.NOT_FOUND,
        code: AppErrorCode.METADATA_NOT_FOUND,
        debug: {
          finalUrl: ctx.finalUrl,
          pageTitle: ctx.pageTitle,
          htmlLength: ctx.html.length,
          htmlPreview: ctx.html.substring(0, 1000),
          bodyPreview: ctx.bodyPreview,
          titleTag: ctx.titleTag,
          matchedSelectors: ctx.matchedSelectors,
          unmatchedSelectors: ctx.unmatchedSelectors,
          selectorResults: ctx.selectorResults,
          ldJsonCount,
          hasNextData,
          hasLdJson,
          hasVideo,
          status: ctx.status,
          cloudflareReasons,
          exceptionMessage: ctx.exceptionMessage,
          exceptionStack: ctx.exceptionStack
        }
      });
    }

    ctx.metadata = this.metadataBuilder.build({
      productId: extracted.finalProductId,
      title: extracted.title,
      actress: extracted.actress,
      releaseDate: extracted.releaseDate,
      series: extracted.series,
      docInfo: ctx.docInfo,
      html: ctx.html,
      debug: {
        finalUrl: ctx.finalUrl,
        pageTitle: ctx.docInfo.title || ctx.pageTitle,
        htmlLength: ctx.html.length,
        htmlPreview: ctx.html.substring(0, 1000),
        bodyPreview: ctx.bodyPreview,
        titleTag: ctx.titleTag,
        matchedSelectors: ctx.matchedSelectors,
        unmatchedSelectors: ctx.unmatchedSelectors,
        selectorResults: ctx.selectorResults,
        ldJsonCount,
        hasNextData,
        hasLdJson,
        hasVideo,
        status: ctx.status,
        cloudflareReasons,
        searchFlowLogs: ctx.searchFlowLogs,
        exceptionMessage: ctx.exceptionMessage,
        exceptionStack: ctx.exceptionStack
      }
    });
  }
}

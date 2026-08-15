import type { IMetadataExtractor, ExtractedMetadataInfo } from './IMetadataExtractor';
import type { ScrapingContext } from '../steps/ScrapingContext';
import { HtmlParserService } from '../parsers/HtmlParserService';

export class MissAvMetadataExtractor implements IMetadataExtractor {
  public extract(ctx: ScrapingContext): ExtractedMetadataInfo {
    const idExtraction = HtmlParserService.extractProductId(ctx.docInfo, ctx.cleanId);
    const { selector1, selector2, regex1, regex2, finalProductId } = idExtraction;
    const bodyContainsProductId = ctx.html.toLowerCase().includes(ctx.cleanId.toLowerCase());

    const rawTitle = (ctx.docInfo.title || ctx.docInfo.h1 || ctx.docInfo.titleDom || ctx.pageTitle || '').trim();
    const title = HtmlParserService.cleanTitle(rawTitle, finalProductId);
    const finalActress = ctx.docInfo.actresses || '';
    const finalReleaseDate = HtmlParserService.extractReleaseDate(ctx.html);
    const series = 'MissAV';
    const maker = ctx.docInfo.maker || '';

    return {
      finalProductId,
      title,
      actress: finalActress,
      releaseDate: finalReleaseDate,
      series,
      maker,
      selector1,
      selector2,
      regex1,
      regex2,
      bodyContainsProductId
    };
  }
}

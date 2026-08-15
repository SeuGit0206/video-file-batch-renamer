import type { ScrapingContext } from '../steps/ScrapingContext';

export interface ExtractedMetadataInfo {
  finalProductId: string;
  title: string;
  actress: string;
  releaseDate: string;
  series: string;
  maker: string;
  selector1: string;
  selector2: string;
  regex1: string;
  regex2: string;
  bodyContainsProductId: boolean;
}

export interface IMetadataExtractor {
  extract(ctx: ScrapingContext): ExtractedMetadataInfo;
}

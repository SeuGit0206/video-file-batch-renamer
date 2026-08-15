import type { ScraperError } from '../errors';

/**
 * Scraper 関連の型定義
 */

export interface DocumentInfo {
  title: string;
  h1: string;
  titleDom: string;
  canonical: string;
  description: string;
  actresses: string;
  maker: string;
}

export interface ScraperDebugInfo {
  finalUrl: string;
  pageTitle: string;
  htmlLength: number;
  htmlPreview: string;
  bodyPreview: string;
  titleTag?: string;
  matchedSelectors?: string[];
  unmatchedSelectors?: string[];
  selectorResults?: Record<string, { found: boolean; value: string }>;
  ldJsonCount?: number;
  hasNextData?: boolean;
  hasLdJson?: boolean;
  hasVideo?: boolean;
  status?: number;
  cloudflareReasons?: string[];
  searchFlowLogs?: string[];
  exceptionMessage?: string;
  exceptionStack?: string;
}

export interface ScrapedMetadata {
  productId: string;
  title?: string;
  actress?: string;
  releaseDate?: string;
  series?: string;
  maker?: string;
  thumbnail?: string;
  coverImageUrl?: string;
  detailUrl?: string;
  source?: string;
  status?: string;
  error?: string;
  isUserEdited?: boolean;
  debug?: ScraperDebugInfo;
}

export interface ScraperErrorResponse {
  error: string;
  details: string;
  status: number;
  debug: ScraperDebugInfo;
}

export type ScraperCustomError = ScraperError;

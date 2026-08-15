/**
 * 型ガード（Type Guards）及び Assertion Functions
 */

import type { ScrapedMetadata, ScraperErrorResponse, ScraperCustomError } from './scraper';

/**
 * unknown 値が null でない Record<string, unknown> オブジェクトか判定する型ガード
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * error が message プロパティを持つか判定する型ガード
 */
export function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    error instanceof Error ||
    (isRecord(error) && typeof error.message === 'string')
  );
}

/**
 * unknown 値から安全にエラーメッセージ文字列を取得するヘルパー関数
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  return String(error);
}

/**
 * error が Playwrightブラウザ未インストール例外（isBrowserMissing フラグ付き）か判定する型ガード
 */
export function isBrowserMissingError(error: unknown): error is { isBrowserMissing: boolean } {
  return isRecord(error) && typeof error.isBrowserMissing === 'boolean';
}

/**
 * error が status や debug 属性を持つ ScraperCustomError か判定する型ガード
 */
export function isScraperCustomError(error: unknown): error is ScraperCustomError {
  return (
    error instanceof Error ||
    (isRecord(error) && ('status' in error || 'debug' in error))
  );
}

/**
 * response が ScraperErrorResponse か判定する型ガード
 */
export function isScraperErrorResponse(data: unknown): data is ScraperErrorResponse {
  return (
    isRecord(data) &&
    typeof data.error === 'string' &&
    typeof data.details === 'string' &&
    typeof data.status === 'number' &&
    isRecord(data.debug)
  );
}

/**
 * data が ScrapedMetadata か判定する型ガード
 */
export function isScrapedMetadata(data: unknown): data is ScrapedMetadata {
  return (
    isRecord(data) &&
    typeof data.productId === 'string' &&
    isRecord(data.debug)
  );
}

/**
 * 配列かつ要素がすべて string か判定する型ガード
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Assertion Function: 値が Record<string, unknown> であることを検証
 */
export function assertIsRecord(value: unknown, message = 'Value must be a record object'): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError(message);
  }
}

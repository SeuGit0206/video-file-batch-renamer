import { describe, it, expect } from 'vitest';
import { AppErrorClassifier } from '../src/errors/AppErrorClassifier';
import { AppErrorCode } from '../src/errors/AppErrorCodes';
import { ScraperError } from '../src/errors/ScraperError';
import { BrowserMissingError } from '../src/errors/BrowserMissingError';
import { HTTP_STATUS } from '../src/constants';

describe('AppErrorClassifier Unit Tests (Phase 91 Step 2)', () => {
  it('ScraperError with 404 status should be classified as METADATA_NOT_FOUND (E2004)', () => {
    const error = new ScraperError('作品情報が見つかりませんでした。', {
      status: HTTP_STATUS.NOT_FOUND,
    });
    const classified = AppErrorClassifier.classify(error);
    expect(classified.code).toBe(AppErrorCode.METADATA_NOT_FOUND);
    expect(classified.category).toBe('recoverable');
    expect(classified.retryable).toBe(true);
  });

  it('ScraperError with METADATA_NOT_FOUND code should be classified as METADATA_NOT_FOUND (E2004)', () => {
    const error = new ScraperError('Not found', {
      code: AppErrorCode.METADATA_NOT_FOUND,
    });
    const classified = AppErrorClassifier.classify(error);
    expect(classified.code).toBe(AppErrorCode.METADATA_NOT_FOUND);
    expect(classified.category).toBe('recoverable');
  });

  it('BrowserMissingError should be classified as BROWSER_MISSING (E1002)', () => {
    const error = new BrowserMissingError('Playwright not found');
    const classified = AppErrorClassifier.classify(error);
    expect(classified.code).toBe(AppErrorCode.BROWSER_MISSING);
    expect(classified.category).toBe('fatal');
  });

  it('Cloudflare block (403) should be classified as CLOUDFLARE_BLOCKED (E2001)', () => {
    const error = new ScraperError('Cloudflare challenge', {
      status: HTTP_STATUS.FORBIDDEN,
    });
    const classified = AppErrorClassifier.classify(error);
    expect(classified.code).toBe(AppErrorCode.CLOUDFLARE_BLOCKED);
    expect(classified.category).toBe('retryable');
  });

  it('General parse failure should be classified as SCRAPE_PARSE_FAILED (E2003)', () => {
    const error = new ScraperError('DOM parse error', {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    });
    const classified = AppErrorClassifier.classify(error);
    expect(classified.code).toBe(AppErrorCode.SCRAPE_PARSE_FAILED);
    expect(classified.category).toBe('recoverable');
  });

  it('Timeout error string should be classified as NETWORK_TIMEOUT (E2002)', () => {
    const error = new Error('Navigation timeout of 30000ms exceeded');
    const classified = AppErrorClassifier.classify(error);
    expect(classified.code).toBe(AppErrorCode.NETWORK_TIMEOUT);
    expect(classified.category).toBe('retryable');
  });

  it('Unexpected system error should fall back to SYSTEM_FATAL (E1001)', () => {
    const error = new Error('Unexpected database file lock error');
    const classified = AppErrorClassifier.classify(error);
    expect(classified.code).toBe(AppErrorCode.SYSTEM_FATAL);
    expect(classified.category).toBe('fatal');
  });
});

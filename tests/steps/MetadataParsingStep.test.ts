import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IMetadataBuilder } from '../../src/builders';
import { ScraperError } from '../../src/errors';
import type { IMetadataExtractor } from '../../src/extractors/IMetadataExtractor';
import { HtmlParserService } from '../../src/parsers';
import type { ILogger } from '../../src/services';
import { MetadataParsingStep } from '../../src/steps/MetadataParsingStep';
import { ScrapingContext } from '../../src/steps/ScrapingContext';
import type { ScrapedMetadata } from '../../src/types';

describe('MetadataParsingStep error handling', () => {
  let logger: ILogger;
  let metadataBuilder: IMetadataBuilder;
  let extractor: IMetadataExtractor;
  let step: MetadataParsingStep;

  beforeEach(() => {
    logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as ILogger;
    metadataBuilder = {
      build: vi.fn(),
    };
    extractor = {
      extract: vi.fn(),
    };
    step = new MetadataParsingStep(logger, metadataBuilder, extractor);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createContext(status: number): ScrapingContext {
    const ctx = new ScrapingContext('abc-123', 'https://missav.ai/ja/');
    ctx.status = status;
    ctx.pageTitle = '取得失敗';
    ctx.html = '<html><body>取得失敗</body></html>';
    return ctx;
  }

  async function captureError(ctx: ScrapingContext): Promise<ScraperError> {
    try {
      await step.execute(ctx);
      throw new Error('MetadataParsingStep should have failed');
    } catch (error) {
      expect(error).toBeInstanceOf(ScraperError);
      return error as ScraperError;
    }
  }

  it('HTTP 403をCloudflareエラーとして扱い、メタデータを生成しない', async () => {
    const ctx = createContext(403);

    const error = await captureError(ctx);

    expect(error.status).toBe(403);
    expect(error.message).toContain('CloudflareException');
    expect(error.debug?.cloudflareReasons).toContain('HTTP Status Code is 403');
    expect(ctx.metadata).toBeNull();
    expect(extractor.extract).not.toHaveBeenCalled();
    expect(metadataBuilder.build).not.toHaveBeenCalled();
  });

  it('HTTP 404を商品ID付きのNot Foundとして扱い、メタデータを生成しない', async () => {
    const ctx = createContext(404);

    const error = await captureError(ctx);

    expect(error.status).toBe(404);
    expect(error.message).toContain('404');
    expect(error.message).toContain('ABC-123');
    expect(error.message).not.toContain('CloudflareException');
    expect(ctx.metadata).toBeNull();
    expect(extractor.extract).not.toHaveBeenCalled();
    expect(metadataBuilder.build).not.toHaveBeenCalled();
  });

  it('通信例外情報を保持し、HTTPエラーへ誤分類せずメタデータを生成しない', async () => {
    const ctx = createContext(500);
    ctx.exceptionMessage = '接続がリセットされました';
    ctx.exceptionStack = 'network stack';

    const error = await captureError(ctx);

    expect(error.status).toBe(500);
    expect(error.message).toBe('Page interaction failed: 接続がリセットされました');
    expect(error.message).not.toContain('CloudflareException');
    expect(error.message).not.toContain('404');
    expect(error.debug?.exceptionMessage).toBe(ctx.exceptionMessage);
    expect(error.debug?.exceptionStack).toBe(ctx.exceptionStack);
    expect(ctx.metadata).toBeNull();
    expect(extractor.extract).not.toHaveBeenCalled();
    expect(metadataBuilder.build).not.toHaveBeenCalled();
  });

  it('earlyReturnResultをそのまま採用し、後続の解析を実行しない', async () => {
    const ctx = createContext(200);
    const earlyResult: ScrapedMetadata = {
      productId: 'ABC-123',
      status: 'NotFound',
      error: 'MissAVに作品が存在しません',
    };
    ctx.earlyReturnResult = earlyResult;
    const parseDiagnostics = vi.spyOn(HtmlParserService, 'parseHtmlDiagnostics');

    await expect(step.execute(ctx)).resolves.toBeUndefined();

    expect(ctx.metadata).toBe(earlyResult);
    expect(parseDiagnostics).not.toHaveBeenCalled();
    expect(extractor.extract).not.toHaveBeenCalled();
    expect(metadataBuilder.build).not.toHaveBeenCalled();
  });
});

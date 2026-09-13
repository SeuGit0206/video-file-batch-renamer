// @vitest-environment jsdom
import fs from 'fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IdentifiedPage } from '../../src/browser/types';
import type { ILogger } from '../../src/services';
import { HtmlExtractionStep } from '../../src/steps/HtmlExtractionStep';
import { ScrapingContext } from '../../src/steps/ScrapingContext';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof fs>('fs');
  return {
    ...actual,
    default: {
      ...actual,
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
    },
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

describe('HtmlExtractionStep error handling', () => {
  let logger: ILogger;
  let step: HtmlExtractionStep;
  let originalBodyInnerTextDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
    document.head.innerHTML = `
      <title>ABC-123 商品タイトル</title>
      <link rel="canonical" href="https://missav.ai/ja/abc-123">
      <meta name="description" content="商品説明">
    `;
    document.body.innerHTML = `
      <h1 class="text-base font-medium">ABC-123 商品タイトル</h1>
      <a href="/makers/test-maker">メーカー</a>
    `;
    originalBodyInnerTextDescriptor = Object.getOwnPropertyDescriptor(document.body, 'innerText');
    Object.defineProperty(document.body, 'innerText', {
      configurable: true,
      value: '本文',
    });
    logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as ILogger;
    step = new HtmlExtractionStep(logger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    if (originalBodyInnerTextDescriptor) {
      Object.defineProperty(document.body, 'innerText', originalBodyInnerTextDescriptor);
    } else {
      Reflect.deleteProperty(document.body, 'innerText');
    }
  });

  function createContext(): ScrapingContext {
    const ctx = new ScrapingContext('abc-123', 'https://missav.ai/ja/');
    ctx.pageTitle = 'ABC-123 商品タイトル';
    ctx.html = '<html><head><title>ABC-123 商品タイトル</title></head><body>本文</body></html>';
    return ctx;
  }

  function createPage(options: { failAll?: boolean } = {}): IdentifiedPage {
    const evaluate = vi.fn().mockImplementation(async (
      pageFunction: (argument?: unknown) => unknown,
      argument?: unknown
    ) => {
      if (options.failAll) {
        throw new Error('DOMを取得できません');
      }
      return pageFunction(argument);
    });

    return { evaluate } as unknown as IdentifiedPage;
  }

  it('pageが存在しなくても安全な代替値を設定して処理を完了する', async () => {
    const ctx = createContext();
    ctx.page = null;

    await expect(step.execute(ctx)).resolves.toBeUndefined();

    expect(ctx.bodyPreview).toBe('(Page is null)');
    expect(ctx.titleTag).toBe('<title>ABC-123 商品タイトル</title>');
    expect(ctx.docInfo.title).toBe('ABC-123 商品タイトル');
    expect(logger.warn).toHaveBeenCalledWith('logDomDiagnostics skipped: page instance is null');
  });

  it('DOM取得が失敗しても失敗状態を保持して安全に処理を完了する', async () => {
    const ctx = createContext();
    ctx.page = createPage({ failAll: true });

    await expect(step.execute(ctx)).resolves.toBeUndefined();

    expect(ctx.bodyPreview).toBe('(Failed to retrieve body innerText)');
    expect(ctx.titleTag).toBe('<title>ABC-123 商品タイトル</title>');
    expect(ctx.selectorResults).toEqual({});
    expect(ctx.docInfo.title).toBe('ABC-123 商品タイトル');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('DOM diagnostics evaluation failed'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Selector evaluation failed'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to retrieve docInfo'));
  });

  it('HTMLログ保存が失敗しても取得済みのページ情報を失わず処理を継続する', async () => {
    const ctx = createContext();
    ctx.page = createPage();
    vi.mocked(fs.writeFileSync).mockImplementation(() => {
      throw new Error('ディスクへ保存できません');
    });

    await expect(step.execute(ctx)).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith('Failed to save HTML logs: ディスクへ保存できません');
    expect(ctx.bodyPreview).toBe('本文');
    expect(ctx.titleTag).toBe('<title>ABC-123 商品タイトル</title>');
    expect(ctx.matchedSelectors).toContain('h1');
    expect(ctx.unmatchedSelectors).toContain('video');
    expect(ctx.docInfo.canonical).toBe('https://missav.ai/ja/abc-123');
  });

  it('詳細情報の取得だけが失敗しても既定情報を維持して処理を完了する', async () => {
    const ctx = createContext();
    ctx.page = createPage();
    vi.spyOn(document, 'title', 'get').mockImplementation(() => {
      throw new Error('詳細情報を取得できません');
    });

    await expect(step.execute(ctx)).resolves.toBeUndefined();

    expect(ctx.bodyPreview).toBe('本文');
    expect(ctx.titleTag).toBe('<title>ABC-123 商品タイトル</title>');
    expect(ctx.docInfo).toEqual({
      title: 'ABC-123 商品タイトル',
      h1: '',
      titleDom: '',
      canonical: '',
      description: '',
      actresses: '',
      maker: '',
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to retrieve docInfo'));
  });
});

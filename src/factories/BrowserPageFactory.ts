import type { BrowserContext, Page } from 'playwright';

/**
 * Page 初期化オプションのインターフェース
 */
export interface PageInitOptions {
  defaultTimeout?: number;
  defaultNavigationTimeout?: number;
  extraHTTPHeaders?: Record<string, string>;
  initScripts?: string[];
}

/**
 * Page 生成および初期設定の責務を担うインターフェース
 */
export interface IBrowserPageFactory {
  createPage(context: BrowserContext, options?: PageInitOptions): Promise<Page>;
}

/**
 * Playwright の Page 生成および初期設定を担うファクトリクラス
 */
export class BrowserPageFactory implements IBrowserPageFactory {
  /**
   * BrowserContext から Page を生成し、初期設定を行って返却します
   */
  public async createPage(context: BrowserContext, options?: PageInitOptions): Promise<Page> {
    const page = await context.newPage();

    if (options?.defaultTimeout !== undefined) {
      page.setDefaultTimeout(options.defaultTimeout);
    }

    if (options?.defaultNavigationTimeout !== undefined) {
      page.setDefaultNavigationTimeout(options.defaultNavigationTimeout);
    }

    if (options?.extraHTTPHeaders) {
      await page.setExtraHTTPHeaders(options.extraHTTPHeaders);
    }

    if (options?.initScripts) {
      for (const script of options.initScripts) {
        await page.addInitScript(script);
      }
    }

    return page;
  }
}

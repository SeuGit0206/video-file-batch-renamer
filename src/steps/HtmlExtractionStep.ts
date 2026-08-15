import path from 'path';
import fs from 'fs';
import type { IScrapingStep } from './IScrapingStep';
import type { ScrapingContext } from './ScrapingContext';
import type { IdentifiedPage } from '../browser/types';
import type { ILogger } from '../services';

export class HtmlExtractionStep implements IScrapingStep {
  constructor(private logger: ILogger) {}

  public async execute(ctx: ScrapingContext): Promise<void> {
    this.logger.info(`Response URL: ${ctx.response ? ctx.response.url() : ctx.url}`);
    this.logger.info("★★★★ CHECKPOINT-1 ★★★★");
    this.logger.info(`Page.Url before content retrieval: ${ctx.finalUrl}`);
    this.logger.info(`Page Title: ${ctx.pageTitle}`);
    this.logger.info("★★★★ CHECKPOINT-2 ★★★★");
    this.logger.info(`HTML Content Length: ${ctx.html.length} characters`);
    this.logger.info(`HTML Preview (First 1000 chars):\n${ctx.html.substring(0, 1000)}`);

    try {
      fs.mkdirSync(path.join(process.cwd(), 'logs', 'html'), { recursive: true });
      const logFilePath = path.join(process.cwd(), 'logs', 'html', `${ctx.cleanId}.html`);
      fs.writeFileSync(logFilePath, ctx.html, 'utf-8');
      fs.writeFileSync(path.join(process.cwd(), 'save-debug.html'), ctx.html, 'utf-8');

      this.logger.info(`HTML saved:\nlogs/html/${ctx.cleanId}.html`);
      this.logger.info("HTML successfully saved to save-debug.html");
    } catch (fileEx: unknown) {
      const fileMsg = fileEx instanceof Error ? fileEx.message : String(fileEx);
      this.logger.error(`Failed to save HTML logs: ${fileMsg}`);
    }

    await this.logDomDiagnostics(ctx.page, ctx.pageTitle);

    try {
      if (ctx.page) {
        ctx.bodyPreview = await ctx.page.evaluate(() => {
          const b = document.body;
          return b ? b.innerText.substring(0, 1000) : '';
        });
      } else {
        ctx.bodyPreview = '(Page is null)';
      }
    } catch {
      ctx.bodyPreview = '(Failed to retrieve body innerText)';
    }

    try {
      if (ctx.page) {
        ctx.titleTag = await ctx.page.evaluate(() => {
          const t = document.querySelector('title');
          return t ? t.outerHTML : '';
        });
      } else {
        ctx.titleTag = `<title>${ctx.pageTitle}</title>`;
      }
    } catch {
      ctx.titleTag = `<title>${ctx.pageTitle}</title>`;
    }

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

    try {
      if (ctx.page) {
        ctx.selectorResults = await ctx.page.evaluate((selectors) => {
          return selectors.reduce((acc, sel) => {
            const el = document.querySelector(sel);
            acc[sel] = {
              found: el !== null,
              value: el ? (el.textContent || el.outerHTML || '').substring(0, 150).replace(/\s+/g, ' ').trim() : ''
            };
            return acc;
          }, {} as Record<string, { found: boolean; value: string }>);
        }, selectorsToTest);

        ctx.matchedSelectors = Object.entries(ctx.selectorResults)
          .filter(([_, r]) => r.found)
          .map(([sel]) => sel);

        ctx.unmatchedSelectors = Object.entries(ctx.selectorResults)
          .filter(([_, r]) => !r.found)
          .map(([sel]) => sel);
      }
    } catch (evalErr: unknown) {
      this.logger.warn(`[Playwright Scraping] Selector evaluation failed: ${evalErr instanceof Error ? evalErr.message : String(evalErr)}`);
    }

    ctx.docInfo = {
      title: ctx.pageTitle || '',
      h1: '',
      titleDom: '',
      canonical: '',
      description: '',
      actresses: '',
      maker: ''
    };

    if (ctx.page && !ctx.exceptionMessage) {
      try {
        ctx.docInfo = await this.extractDocInfoFromPage(ctx.page);
      } catch (docInfoErr: unknown) {
        this.logger.warn(`Failed to retrieve docInfo: ${docInfoErr instanceof Error ? docInfoErr.message : String(docInfoErr)}`);
      }
    }
  }

  private async logDomDiagnostics(page: IdentifiedPage | null, pageTitle: string): Promise<void> {
    if (!page) {
      this.logger.warn("logDomDiagnostics skipped: page instance is null");
      return;
    }
    try {
      const diag = await page.evaluate(() => {
        const bodyText = document.body ? document.body.innerText : '';
        const ldJsonScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
          .map(s => s.textContent || '');
        const videos = document.querySelectorAll('video').length;
        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        const h1 = document.querySelector('h1')?.textContent?.trim() || '';

        return {
          bodyLength: bodyText.length,
          bodySnippet: bodyText.substring(0, 300).replace(/\s+/g, ' '),
          ldJsonCount: ldJsonScripts.length,
          videoCount: videos,
          iframeSources: iframes,
          h1
        };
      });

      this.logger.info(`\n--- [DOM Diagnostics Check] ---`);
      this.logger.info(`  Title: "${pageTitle}"`);
      this.logger.info(`  H1: "${diag.h1}"`);
      this.logger.info(`  Body text length: ${diag.bodyLength}`);
      this.logger.info(`  Body snippet: "${diag.bodySnippet}"`);
      this.logger.info(`  LD+JSON scripts count: ${diag.ldJsonCount}`);
      this.logger.info(`  Video tags count: ${diag.videoCount}`);
      this.logger.info(`  Iframes: ${JSON.stringify(diag.iframeSources)}`);
      this.logger.info(`--------------------------------\n`);
    } catch (err: unknown) {
      this.logger.warn(`DOM diagnostics evaluation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async extractDocInfoFromPage(page: IdentifiedPage): Promise<{
    title: string;
    h1: string;
    titleDom: string;
    canonical: string;
    description: string;
    actresses: string;
    maker: string;
  }> {
    return page.evaluate(() => {
      const title = document.title || '';
      const h1 = document.querySelector('h1')?.textContent?.trim() || '';
      const titleDom = document.querySelector('.text-base.font-medium, h1.text-base')?.textContent?.trim() || '';
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
      const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

      const actressEls = Array.from(document.querySelectorAll('a[href*="/actresses/"]'));
      const actresses = actressEls.map(e => e.textContent?.trim()).filter(Boolean).join(', ');

      const makerEl = document.querySelector('a[href*="/makers/"]');
      const maker = makerEl?.textContent?.trim() || '';

      return {
        title,
        h1,
        titleDom,
        canonical,
        description,
        actresses,
        maker
      };
    });
  }
}

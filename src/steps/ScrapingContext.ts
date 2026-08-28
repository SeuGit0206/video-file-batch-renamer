import type { Browser, BrowserContext, Response as PWResponse, Cookie } from 'playwright';
import type { IdentifiedPage } from '../browser/types';
import type { ScrapedMetadata, DocumentInfo, CloudflareTimelineLog } from '../types';
import { HTTP_STATUS } from '../constants';

/**
 * スクレイピングフロー全体で共有されるコンテキスト状態クラス
 */
export class ScrapingContext {
  public readonly productId: string;
  public readonly cleanId: string;
  public url: string;

  public browser: Browser | null = null;
  public context: BrowserContext | null = null;
  public page: IdentifiedPage | null = null;
  public response: PWResponse | null = null;
  public status: number = HTTP_STATUS.OK;
  public finalUrl: string = '';
  public pageTitle: string = '';
  public html: string = '';
  public bodyPreview: string = '';
  public titleTag: string = '';
  public matchedSelectors: string[] = [];
  public unmatchedSelectors: string[] = [];
  public selectorResults: Record<string, { found: boolean; value: string }> = {};
  public exceptionMessage: string = '';
  public exceptionStack: string | undefined = undefined;
  public searchFlowLogs: string[] = [];
  public cfTimeline: CloudflareTimelineLog[] = [];
  public globalCookies: Cookie[] = [];

  public page403Data: Record<string, unknown> | null = null;
  public page200Data: Record<string, unknown> | null = null;
  public isBypassed: boolean = false;

  public docInfo: DocumentInfo = {
    title: '',
    h1: '',
    titleDom: '',
    canonical: '',
    description: '',
    actresses: '',
    maker: ''
  };

  public metadata: ScrapedMetadata | null = null;
  public earlyReturnResult: ScrapedMetadata | null = null;

  constructor(productId: string, baseUrl: string) {
    this.productId = productId;
    const rawId = typeof productId === 'string' ? productId : '';
    this.cleanId = rawId.trim().toUpperCase();
    const rawBaseUrl = typeof baseUrl === 'string' ? baseUrl.trim() : '';
    const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, '');
    this.url = `${cleanBaseUrl}/${this.cleanId.toLowerCase()}`;
    this.finalUrl = this.url;
  }

  public logSearchFlow(logFn: (msg: string) => void, msg: string): void {
    logFn(msg);
    this.searchFlowLogs.push(msg);
  }

  public addTimelineLog(event: string, details: Record<string, unknown> = {}): void {
    this.cfTimeline.push({
      timestamp: new Date().toISOString(),
      event,
      ...details
    });
  }
}

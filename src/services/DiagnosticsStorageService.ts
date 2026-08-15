import path from 'path';
import fs from 'fs';
import type { Page, BrowserContextOptions } from 'playwright';
import type { ILogger } from './LoggingService';
import { LoggingService } from './LoggingService';
import { HTML_LOGS_DIR_NAME } from '../constants';
import type { IMetricsCollector } from '../metrics/IMetricsCollector';
import { NullMetricsCollector } from '../metrics/NullMetricsCollector';

/**
 * 診断データ保存サービスインターフェース
 */
export interface IDiagnosticsStorageService {
  ensureDiagnosticsDir(): void;
  savePlaywrightDiff(contextOptions: BrowserContextOptions, headless: boolean): void;
  savePageComparison(
    page403Data: Record<string, unknown> | null,
    page200Data: Record<string, unknown> | null
  ): void;
  saveCDPLog(suffix: string, cdpEvents: unknown[]): void;
  saveFingerprint(fingerprintData: unknown): void;
  runAndSaveFingerprint(activePage: Page): Promise<void>;
  saveHtmlLog(cleanId: string, suffix: string, bodyInner: string, docOuter: string, pContent: string): void;
  runAndSaveHTML(activePage: Page, suffix: string, cleanId: string): Promise<void>;
  saveScreenshot?(activePage: Page, suffix: string): Promise<void>;
  saveHar?(harPath: string): Promise<void>;
}

/**
 * HTMLログ・デバッグJSON・Comparison情報等のローカルディスク保存を担うサービス実装
 */
export class DiagnosticsStorageService implements IDiagnosticsStorageService {
  private logger: ILogger;
  private metricsCollector: IMetricsCollector;

  constructor(logger?: ILogger, metricsCollector?: IMetricsCollector) {
    this.logger = logger || LoggingService.getInstance();
    this.metricsCollector = metricsCollector || new NullMetricsCollector();
  }

  /**
   * ログ保存用ディレクトリを生成・保証します
   */
  public ensureDiagnosticsDir(): void {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      const htmlDir = path.join(process.cwd(), HTML_LOGS_DIR_NAME);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      if (!fs.existsSync(htmlDir)) {
        fs.mkdirSync(htmlDir, { recursive: true });
      }
    } catch (e: unknown) {
      this.logger.error("Failed to ensure diagnostics directories:", e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * Playwright コンテキスト設定のデフォルト値と現在値の差分情報を保存します
   */
  public savePlaywrightDiff(contextOptions: BrowserContextOptions, headless: boolean): void {
    try {
      this.ensureDiagnosticsDir();
      const defaults = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        headless: true
      };
      const current = {
        userAgent: contextOptions.userAgent,
        viewport: contextOptions.viewport,
        headless
      };
      const playwrightDiff = {
        defaults,
        current,
        differences: {
          userAgentDiff: contextOptions.userAgent !== defaults.userAgent,
          viewportDiff: JSON.stringify(contextOptions.viewport) !== JSON.stringify(defaults.viewport),
          headlessDiff: headless !== defaults.headless
        }
      };
      fs.writeFileSync(
        path.join(process.cwd(), 'logs', 'playwright-options-diff.json'),
        JSON.stringify(playwrightDiff, null, 2),
        'utf-8'
      );
    } catch (e: unknown) {
      this.logger.error("Failed to save playwright option diff:", e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * 403 状態と 200 状態のページ比較結果を JSON として保存します
   */
  public savePageComparison(
    page403Data: Record<string, unknown> | null,
    page200Data: Record<string, unknown> | null
  ): void {
    try {
      if (page403Data && page200Data) {
        this.ensureDiagnosticsDir();
        const pageComparison = {
          page403: page403Data,
          page200: page200Data,
          differences: {
            statusChanged: page403Data.status !== page200Data.status,
            titleChanged: page403Data.title !== page200Data.title,
            sizeDelta: (page200Data.htmlLen as number) - (page403Data.htmlLen as number),
            cookiesDelta: (page200Data.cookiesCount as number) - (page403Data.cookiesCount as number)
          }
        };
        fs.writeFileSync(
          path.join(process.cwd(), 'logs', 'page-comparison.json'),
          JSON.stringify(pageComparison, null, 2),
          'utf-8'
        );
      }
    } catch (e: unknown) {
      this.logger.error("Failed to save page comparison:", e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * CDP イベントログを JSON ファイルとして保存します
   */
  public saveCDPLog(suffix: string, cdpEvents: unknown[]): void {
    try {
      this.ensureDiagnosticsDir();
      fs.writeFileSync(
        path.join(process.cwd(), 'logs', `cdp-${suffix}.json`),
        JSON.stringify(cdpEvents, null, 2),
        'utf-8'
      );
      this.metricsCollector.recordCdpLogSaved();
    } catch (e: unknown) {
      this.logger.error("CDP saving failed:", e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * ブラウザフィンガープリントデータを保存します
   */
  public saveFingerprint(fingerprintData: unknown): void {
    try {
      this.ensureDiagnosticsDir();
      fs.writeFileSync(
        path.join(process.cwd(), 'logs', 'browser-fingerprint.json'),
        JSON.stringify(fingerprintData, null, 2),
        'utf-8'
      );
    } catch (e: unknown) {
      this.logger.error("Fingerprint saving failed:", e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * Page からブラウザフィンガープリント情報を取得して保存します
   */
  public async runAndSaveFingerprint(activePage: Page): Promise<void> {
    try {
      const fingerprint = await activePage.evaluate(async () => {
        let canvasFp = '';
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.textBaseline = 'top';
            ctx.font = "14px 'Arial'";
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('no-CF-detection-please 🌐', 2, 15);
            canvasFp = canvas.toDataURL();
          }
        } catch (e: unknown) {
          canvasFp = 'error: ' + (e instanceof Error ? e.message : String(e));
        }

        let webgl: Record<string, unknown> = {};
        try {
          const canvas = document.createElement('canvas');
          const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
          if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            webgl = {
              vendor: gl.getParameter(gl.VENDOR),
              renderer: gl.getParameter(gl.RENDERER),
              unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'none',
              unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'none',
              shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
              version: gl.getParameter(gl.VERSION),
            };
          }
        } catch (e: unknown) {
          webgl = { error: e instanceof Error ? e.message : String(e) };
        }

        const plugins = [];
        if (navigator.plugins) {
          for (let i = 0; i < navigator.plugins.length; i++) {
            const p = navigator.plugins[i];
            plugins.push({ name: p.name, filename: p.filename, description: p.description });
          }
        }

        const mimeTypes = [];
        if (navigator.mimeTypes) {
          for (let i = 0; i < navigator.mimeTypes.length; i++) {
            const m = navigator.mimeTypes[i];
            mimeTypes.push({ type: m.type, description: m.description, suffixes: m.suffixes });
          }
        }

        const permissions: Record<string, string> = {};
        const permsToQuery = ['notifications', 'geolocation', 'microphone', 'camera', 'clipboard-read', 'clipboard-write'];
        for (const name of permsToQuery) {
          try {
            const status = await navigator.permissions.query({ name: name as unknown as PermissionName });
            permissions[name] = status.state;
          } catch (e: unknown) {
            permissions[name] = 'error: ' + (e instanceof Error ? e.message : String(e));
          }
        }

        let clientHints = {};
        try {
          const nav = navigator as unknown as { userAgentData?: { brands: unknown; mobile: boolean; platform: string; getHighEntropyValues: (keys: string[]) => Promise<unknown> } };
          if (nav.userAgentData) {
            const uaData = nav.userAgentData;
            const highEntropyValues = await uaData.getHighEntropyValues(['architecture', 'model', 'platformVersion', 'uaFullVersion', 'fullVersionList']);
            clientHints = {
              brands: uaData.brands,
              mobile: uaData.mobile,
              platform: uaData.platform,
              highEntropyValues
            };
          }
        } catch (e: unknown) {
          clientHints = { error: e instanceof Error ? e.message : String(e) };
        }

        return {
          userAgent: navigator.userAgent,
          webdriver: navigator.webdriver,
          languages: navigator.languages,
          language: navigator.language,
          platform: navigator.platform,
          vendor: navigator.vendor,
          hardwareConcurrency: navigator.hardwareConcurrency,
          deviceMemory: (navigator as unknown as { deviceMemory?: number }).deviceMemory || 'undefined',
          maxTouchPoints: navigator.maxTouchPoints,
          window: {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            outerWidth: window.outerWidth,
            outerHeight: window.outerHeight,
            devicePixelRatio: window.devicePixelRatio,
          },
          screen: {
            width: screen.width,
            height: screen.height,
            availWidth: screen.availWidth,
            availHeight: screen.availHeight,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixelDepth,
          },
          chrome: typeof (window as unknown as { chrome?: { app?: unknown; runtime?: unknown } }).chrome === 'object' ? {
            app: typeof (window as unknown as { chrome: { app?: unknown } }).chrome.app,
            runtime: typeof (window as unknown as { chrome: { runtime?: unknown } }).chrome.runtime,
          } : 'undefined',
          canvasFp,
          webgl,
          plugins,
          mimeTypes,
          permissions,
          clientHints
        };
      });
      this.saveFingerprint(fingerprint);
    } catch (e: unknown) {
      this.logger.error("Fingerprint collection failed:", e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * HTML 文字列ログをファイルへ保存します
   */
  public saveHtmlLog(
    cleanId: string,
    suffix: string,
    bodyInner: string,
    docOuter: string,
    pContent: string
  ): void {
    try {
      this.ensureDiagnosticsDir();
      fs.writeFileSync(
        path.join(process.cwd(), 'logs', 'html', `${cleanId}-body-inner-${suffix}.html`),
        bodyInner,
        'utf-8'
      );
      fs.writeFileSync(
        path.join(process.cwd(), 'logs', 'html', `${cleanId}-doc-outer-${suffix}.html`),
        docOuter,
        'utf-8'
      );
      fs.writeFileSync(
        path.join(process.cwd(), 'logs', 'html', `${cleanId}-page-content-${suffix}.html`),
        pContent,
        'utf-8'
      );
      this.metricsCollector.recordHtmlSaved();
    } catch (e: unknown) {
      this.logger.error("HTML collection failed:", e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * Page から HTML 内容を取得して保存します
   */
  public async runAndSaveHTML(activePage: Page, suffix: string, cleanId: string): Promise<void> {
    try {
      const bodyInner = await activePage.evaluate(() => (document.body ? document.body.innerHTML : ''));
      const docOuter = await activePage.evaluate(() => (document.documentElement ? document.documentElement.outerHTML : ''));
      const pContent = await activePage.content();

      this.saveHtmlLog(cleanId, suffix, bodyInner, docOuter, pContent);
    } catch (e: unknown) {
      this.logger.error("HTML collection failed:", e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * 将来拡張用: スクリーンショット保存機能
   */
  public async saveScreenshot(_activePage: Page, _suffix: string): Promise<void> {
    // 将来拡張用フック
  }

  /**
   * 将来拡張用: HARファイル保存機能
   */
  public async saveHar(_harPath: string): Promise<void> {
    // 将来拡張用フック
  }
}

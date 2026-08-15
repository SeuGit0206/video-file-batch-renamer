import type { BrowserContext, Page, CDPSession } from 'playwright';
import type { CdpEventLog, CdpSessionWithEmit } from '../types';
import type { ILogger } from './LoggingService';
import { LoggingService } from './LoggingService';
import { DiagnosticsStorageService, type IDiagnosticsStorageService } from './DiagnosticsStorageService';

/**
 * CDP Tracking 結果オブジェクトのインターフェース
 */
export interface CdpSessionResult {
  cdpClient: CDPSession | null;
  saveCDP: () => void;
}

/**
 * CDP Diagnostics（CDPセッション生成・イベント監視）を担当するインターフェース
 */
export interface ICdpDiagnosticsService {
  setupCDPTracking(
    activeContext: BrowserContext,
    activePage: Page,
    suffix: string
  ): Promise<CdpSessionResult>;
  enableHarTracing?(activeContext: BrowserContext): Promise<void>;
}

/**
 * Chrome DevTools Protocol (CDP) の監視・セッション制御を担うサービス実装
 */
export class CdpDiagnosticsService implements ICdpDiagnosticsService {
  private logger: ILogger;
  private storageService: IDiagnosticsStorageService;

  constructor(logger?: ILogger, storageService?: IDiagnosticsStorageService) {
    this.logger = logger || LoggingService.getInstance();
    this.storageService = storageService || new DiagnosticsStorageService(this.logger);
  }

  /**
   * 指定した BrowserContext と Page に対して CDP セッションを確立し、
   * ネットワーク・ページ・コンソール等のイベントログ収集を開始します
   */
  public async setupCDPTracking(
    activeContext: BrowserContext,
    activePage: Page,
    suffix: string
  ): Promise<CdpSessionResult> {
    const cdpEvents: CdpEventLog[] = [];
    try {
      const cdpClient = await activeContext.newCDPSession(activePage);
      await cdpClient.send('Network.enable');
      await cdpClient.send('Page.enable');
      await cdpClient.send('Runtime.enable');
      await cdpClient.send('Security.enable');
      await cdpClient.send('Log.enable');
      await cdpClient.send('Performance.enable');

      const cdpWithEmit = cdpClient as unknown as CdpSessionWithEmit;
      const originalEmit = cdpWithEmit.emit;
      cdpWithEmit.emit = function (event: string, ...args: unknown[]) {
        cdpEvents.push({ event, args, timestamp: Date.now() });
        return originalEmit.apply(this, [event, ...args]);
      };

      return {
        cdpClient,
        saveCDP: () => {
          this.storageService.saveCDPLog(suffix, cdpEvents);
        }
      };
    } catch (e: unknown) {
      this.logger.error("CDP setup failed:", e instanceof Error ? e.message : String(e));
      return {
        cdpClient: null,
        saveCDP: () => {}
      };
    }
  }

  /**
   * 将来拡張用: HAR / Tracing 機能の有効化ポイント
   */
  public async enableHarTracing(_activeContext: BrowserContext): Promise<void> {
    // 将来拡張用フック
  }
}

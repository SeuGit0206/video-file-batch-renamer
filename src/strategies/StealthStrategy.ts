/**
 * Stealth（ボット検知回避）戦略のインターフェース
 */
export interface IStealthStrategy {
  wait(ms?: number): Promise<void>;
  handleCloudflareDetected(pageTitle: string, status: number): Promise<void>;
  applyStealthContextOptions<T extends Record<string, unknown>>(options: T): T;
}

/**
 * Cloudflare検知後の待機や環境拡張ポイントを提供する StealthStrategy 実装クラス
 */
export class StealthStrategy implements IStealthStrategy {
  /**
   * 指定したミリ秒間待機します
   */
  public async wait(ms: number = 2000): Promise<void> {
    if (ms > 0) {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  }

  /**
   * Cloudflare 検知時の事前処理・フック（将来拡張用）
   */
  public async handleCloudflareDetected(_pageTitle: string, _status: number): Promise<void> {
    // 将来的な Stealth スクリプト挿入やログフックの拡張ポイント
  }

  /**
   * BrowserContext のオプションに対する Stealth 設定の適用（将来拡張用）
   */
  public applyStealthContextOptions<T extends Record<string, unknown>>(options: T): T {
    // UserAgent や各種ヘッダーのアンチボット調整等の拡張ポイント
    return options;
  }
}

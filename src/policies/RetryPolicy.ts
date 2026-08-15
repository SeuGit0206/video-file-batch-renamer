/**
 * RetryPolicy に指定するオプション
 */
export interface RetryPolicyOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  cloudflareTimeoutMs?: number;
  cloudflarePollIntervalMs?: number;
  cloudflareMinWaitMs?: number;
}

/**
 * リトライおよびタイムアウトポリシーを定義するインターフェース
 */
export interface IRetryPolicy {
  getMaxRetries(): number;
  shouldRetry(attempt: number): boolean;
  getWaitTime(attempt: number): number;
  getCloudflareTimeout(): number;
  getCloudflarePollInterval(): number;
  getCloudflareMinWaitTime(): number;
  isCloudflareTimeout(elapsedMs: number): boolean;
}

/**
 * リトライ可否判定・待機時間計算・Cloudflareタイムアウト判定を担うポリシークラス
 */
export class RetryPolicy implements IRetryPolicy {
  private maxRetries: number;
  private initialDelayMs: number;
  private backoffFactor: number;
  private cloudflareTimeoutMs: number;
  private cloudflarePollIntervalMs: number;
  private cloudflareMinWaitMs: number;

  constructor(options?: RetryPolicyOptions) {
    this.maxRetries = options?.maxRetries ?? 1;
    this.initialDelayMs = options?.initialDelayMs ?? 2000;
    this.backoffFactor = options?.backoffFactor ?? 1;
    this.cloudflareTimeoutMs = options?.cloudflareTimeoutMs ?? 15000;
    this.cloudflarePollIntervalMs = options?.cloudflarePollIntervalMs ?? 2000;
    this.cloudflareMinWaitMs = options?.cloudflareMinWaitMs ?? 5000;
  }

  /**
   * 最大リトライ回数を取得します
   */
  public getMaxRetries(): number {
    return this.maxRetries;
  }

  /**
   * 指定した試行回数がリトライ可能か判定します
   */
  public shouldRetry(attempt: number): boolean {
    return attempt <= this.maxRetries;
  }

  /**
   * 試行回数に基づく待機時間（Backoff適用）を計算します
   */
  public getWaitTime(attempt: number): number {
    if (attempt <= 1) {
      return this.initialDelayMs;
    }
    return Math.round(this.initialDelayMs * Math.pow(this.backoffFactor, attempt - 1));
  }

  /**
   * Cloudflare チャレンジ全体のタイムアウト時間（ミリ秒）を取得します
   */
  public getCloudflareTimeout(): number {
    return this.cloudflareTimeoutMs;
  }

  /**
   * Cloudflare チャレンジ監視時のポーリング間隔（ミリ秒）を取得します
   */
  public getCloudflarePollInterval(): number {
    return this.cloudflarePollIntervalMs;
  }

  /**
   * Cloudflare 解除判定に必要な最小待機時間（ミリ秒）を取得します
   */
  public getCloudflareMinWaitTime(): number {
    return this.cloudflareMinWaitMs;
  }

  /**
   * 経過時間が Cloudflare タイムアウトを超過しているか判定します
   */
  public isCloudflareTimeout(elapsedMs: number): boolean {
    return elapsedMs >= this.cloudflareTimeoutMs;
  }
}

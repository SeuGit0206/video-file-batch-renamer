export interface ILogger {
  info(message: unknown, ...args: unknown[]): void;
  warn(message: unknown, ...args: unknown[]): void;
  error(message: unknown, ...args: unknown[]): void;
  debug(message: unknown, ...args: unknown[]): void;
}

/**
 * アプリケーション全体のログ出力を一元管理する統一サービス
 */
export class LoggingService implements ILogger {
  private static instance: LoggingService;

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  /**
   * INFOレベルのログを出力
   */
  public info(message: unknown, ...args: unknown[]): void {
    console.log(message, ...args);
  }

  /**
   * WARNレベルのログを出力
   */
  public warn(message: unknown, ...args: unknown[]): void {
    console.warn(message, ...args);
  }

  /**
   * ERRORレベルのログを出力
   */
  public error(message: unknown, ...args: unknown[]): void {
    console.error(message, ...args);
  }

  /**
   * DEBUGレベルのログを出力
   */
  public debug(message: unknown, ...args: unknown[]): void {
    if (typeof console.debug === 'function') {
      console.debug(message, ...args);
    } else {
      console.log(message, ...args);
    }
  }

  /**
   * スタティック便利メソッド: INFO
   */
  public static info(message: unknown, ...args: unknown[]): void {
    LoggingService.getInstance().info(message, ...args);
  }

  /**
   * スタティック便利メソッド: WARN
   */
  public static warn(message: unknown, ...args: unknown[]): void {
    LoggingService.getInstance().warn(message, ...args);
  }

  /**
   * スタティック便利メソッド: ERROR
   */
  public static error(message: unknown, ...args: unknown[]): void {
    LoggingService.getInstance().error(message, ...args);
  }

  /**
   * スタティック便利メソッド: DEBUG
   */
  public static debug(message: unknown, ...args: unknown[]): void {
    LoggingService.getInstance().debug(message, ...args);
  }
}

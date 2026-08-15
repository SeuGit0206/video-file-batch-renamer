import { AppErrorCode, type AppErrorDetails } from './AppErrorCodes';
import { BaseAppError } from './BaseAppError';
import { BrowserMissingError } from './BrowserMissingError';
import { ScraperError } from './ScraperError';

/**
 * 発生したエラーを解析・分類し、ユーザー向けメッセージと対処法を提供する分類クラス
 */
export class AppErrorClassifier {
  public static classify(error: unknown): AppErrorDetails {
    if (error instanceof BaseAppError && error.details) {
      return error.details;
    }

    if (error instanceof BrowserMissingError) {
      return {
        code: AppErrorCode.BROWSER_MISSING,
        category: 'fatal',
        userMessage: 'Playwright ブラウザがインストールされていないか、起動できません。',
        suggestion: '`npx playwright install` を実行するか、サーバー環境を確認してください。',
        retryable: false,
        technicalDetails: error.message,
      };
    }

    if (error instanceof ScraperError) {
      const isCf = error.message.includes('Cloudflare') || error.status === 403;
      if (isCf) {
        return {
          code: AppErrorCode.CLOUDFLARE_BLOCKED,
          category: 'retryable',
          userMessage: 'スクレイピング先サイトのBot保護(Cloudflare)によってブロックされました。',
          suggestion: 'Stealthモードを有効化するか、数分置いてから再試行してください。',
          retryable: true,
          technicalDetails: error.message,
        };
      }
      return {
        code: AppErrorCode.SCRAPE_PARSE_FAILED,
        category: 'recoverable',
        userMessage: 'メタデータの解析に失敗しました。',
        suggestion: '作品IDが正しいか、またはサイト仕様に変更がないか確認してください。',
        retryable: true,
        technicalDetails: error.message,
      };
    }

    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('TIMEOUT') || message.includes('timeout')) {
      return {
        code: AppErrorCode.NETWORK_TIMEOUT,
        category: 'retryable',
        userMessage: 'ネットワーク通信がタイムアウトしました。',
        suggestion: '接続状態を確認し、再度取得ボタンを押してください。',
        retryable: true,
        technicalDetails: message,
      };
    }

    if (message.includes('Permission') || message.includes('EACCES')) {
      return {
        code: AppErrorCode.RENAME_PERMISSION_DENIED,
        category: 'recoverable',
        userMessage: 'ファイルへの書き込み権限がありません。',
        suggestion: '対象ファイルのアクセス権限または書き込み禁止状態を確認してください。',
        retryable: true,
        technicalDetails: message,
      };
    }

    if (message.includes('EEXIST') || message.includes('already exists')) {
      return {
        code: AppErrorCode.RENAME_FILE_EXISTS,
        category: 'recoverable',
        userMessage: '同名のファイルがすでに存在します。',
        suggestion: 'リネームルールの設定を変更するか、手動で競合を解決してください。',
        retryable: false,
        technicalDetails: message,
      };
    }

    return {
      code: AppErrorCode.SYSTEM_FATAL,
      category: 'fatal',
      userMessage: '予期しないシステムエラーが発生しました。',
      suggestion: 'ログを出力して管理者にお問い合わせいただくか、アプリを再起動してください。',
      retryable: false,
      technicalDetails: message,
    };
  }
}

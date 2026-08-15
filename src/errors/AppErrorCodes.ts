/**
 * アプリケーションエラーコード定義 (E1000 - E5000系)
 */
export enum AppErrorCode {
  // システム・インフラ層 (1000番台)
  SYSTEM_FATAL = 'E1001',
  BROWSER_MISSING = 'E1002',
  SERVICE_UNAVAILABLE = 'E1003',

  // スクレイピング・通信層 (2000番台)
  NETWORK_TIMEOUT = 'E2001',
  SCRAPE_PARSE_FAILED = 'E2002',
  CLOUDFLARE_BLOCKED = 'E2003',
  METADATA_NOT_FOUND = 'E2004',

  // ルールエンジン・ドメイン層 (3000番台)
  RULE_SYNTAX_ERROR = 'E3001',
  RULE_EVALUATION_FAILED = 'E3002',

  // インポート / エクスポート層 (4000番台)
  IMPORT_INVALID_FORMAT = 'E4001',
  IMPORT_VALIDATION_FAILED = 'E4002',
  EXPORT_GENERATION_FAILED = 'E4003',

  // リネーム物理実行層 (5000番台)
  RENAME_PERMISSION_DENIED = 'E5001',
  RENAME_FILE_EXISTS = 'E5002',
  RENAME_PATH_INVALID = 'E5003',
  TRANSACTION_ROLLBACK_FAILED = 'E5004',
}

export type ErrorCategory = 'recoverable' | 'fatal' | 'retryable';

export interface AppErrorDetails {
  code: AppErrorCode;
  category: ErrorCategory;
  userMessage: string;
  suggestion: string;
  retryable: boolean;
  technicalDetails?: string;
}

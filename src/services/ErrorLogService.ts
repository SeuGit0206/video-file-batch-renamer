import fs from 'fs';
import path from 'path';
import { LOGS_DIR_NAME, ERROR_LOG_FILE_PATH } from '../constants';
import { LoggingService } from './LoggingService';

/**
 * 詳細なエラーログおよびスタックトレースをファイルへ出力するサービス
 */
export class ErrorLogService {
  /**
   * logs/error.log へタイムスタンプ付きでエラー情報を記録
   */
  public static saveErrorLog(error: Error): void {
    try {
      const logDir = path.join(process.cwd(), LOGS_DIR_NAME);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logFile = path.join(process.cwd(), ERROR_LOG_FILE_PATH);
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}]\nMessage: ${error.message}\nStack: ${error.stack}\n-------------------------------------\n`;
      fs.appendFileSync(logFile, logMessage, 'utf-8');
    } catch (e: unknown) {
      LoggingService.error('Failed to write to error.log:', e instanceof Error ? e.message : String(e));
    }
  }
}

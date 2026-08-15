import fs from 'fs';
import path from 'path';
import type { Cookie } from 'playwright';
import { COOKIES_FILE_PATH, STORAGE_STATE_FILE_PATH, LOGS_DIR_NAME } from '../constants';
import { LoggingService } from './LoggingService';

/**
 * クッキーおよび StorageState ファイルの読み書き・永続化を管理するサービス
 */
export class CookieService {
  private static readonly cookiesPath = path.join(process.cwd(), COOKIES_FILE_PATH);
  private static readonly storageStatePath = path.join(process.cwd(), STORAGE_STATE_FILE_PATH);

  /**
   * cookies.json からクッキー配列を読み込む
   */
  public static loadCookies(): Cookie[] {
    try {
      if (fs.existsSync(this.cookiesPath)) {
        const data = fs.readFileSync(this.cookiesPath, 'utf-8');
        return JSON.parse(data) as Cookie[];
      }
    } catch (e: unknown) {
      LoggingService.getInstance().warn('Failed to load cookies.json:', e instanceof Error ? e.message : String(e));
    }
    return [];
  }

  /**
   * cookies.json へクッキー配列を保存する
   */
  public static saveCookies(cookies: Cookie[]): void {
    try {
      const dir = path.join(process.cwd(), LOGS_DIR_NAME);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.cookiesPath, JSON.stringify(cookies, null, 2), 'utf-8');
    } catch (e: unknown) {
      LoggingService.getInstance().warn('Failed to save cookies.json:', e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * storageState.json が存在するか確認
   */
  public static hasStorageState(): boolean {
    return fs.existsSync(this.storageStatePath);
  }

  /**
   * storageState.json の絶対パスを取得
   */
  public static getStorageStatePath(): string {
    return this.storageStatePath;
  }
}

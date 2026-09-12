import type { AppSettingsExport, HistoryData, AppBackup, VideoFile } from '../types';
import { APP_VERSION } from '../constants';

const HISTORY_KEY = 'vrt_app_history';
const BACKUPS_KEY = 'vrt_app_backups';

const MAX_HISTORY_ITEMS = 20;
const MAX_BACKUP_ITEMS = 10;

export class StorageService {
  /**
   * 設定データの書き出し（JSON文字列化）
   */
  public static exportSettings(settings: Omit<AppSettingsExport, 'version' | 'exportedAt'>): string {
    const fullData: AppSettingsExport = {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      ...settings,
    };
    return JSON.stringify(fullData, null, 2);
  }

  /**
   * 設定データのインポート検証と解析
   */
  public static parseSettingsJson(jsonString: string): Partial<AppSettingsExport> {
    try {
      const parsed = JSON.parse(jsonString) as Record<string, unknown>;
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('無効な設定JSONフォーマットです');
      }
      return parsed as Partial<AppSettingsExport>;
    } catch (err) {
      const message = err instanceof Error ? err.message : '設定JSONの解析に失敗しました';
      throw new Error(`インポートエラー: ${message}`);
    }
  }

  /**
   * 履歴データの取得
   */
  public static getHistory(): HistoryData {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return { recentFolders: [], recentTemplates: [], recentRenames: [] };
      }
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return { recentFolders: [], recentTemplates: [], recentRenames: [] };
      const parsed = JSON.parse(raw) as Partial<HistoryData>;
      return {
        recentFolders: Array.isArray(parsed.recentFolders) ? parsed.recentFolders : [],
        recentTemplates: Array.isArray(parsed.recentTemplates) ? parsed.recentTemplates : [],
        recentRenames: Array.isArray(parsed.recentRenames) ? parsed.recentRenames : [],
      };
    } catch {
      return { recentFolders: [], recentTemplates: [], recentRenames: [] };
    }
  }

  /**
   * 履歴データの保存
   */
  public static saveHistory(data: HistoryData): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
      }
    } catch (e) {
      console.error('Failed to save history to localStorage', e);
    }
  }

  /**
   * 最近使用したフォルダを追加
   */
  public static addRecentFolder(folderPath: string): HistoryData {
    if (!folderPath.trim()) return this.getHistory();
    const history = this.getHistory();
    const filtered = history.recentFolders.filter((f) => f !== folderPath);
    filtered.unshift(folderPath);
    history.recentFolders = filtered.slice(0, MAX_HISTORY_ITEMS);
    this.saveHistory(history);
    return history;
  }

  /**
   * 最近使用したテンプレートを追加
   */
  public static addRecentTemplate(template: string): HistoryData {
    if (!template.trim()) return this.getHistory();
    const history = this.getHistory();
    const filtered = history.recentTemplates.filter((t) => t !== template);
    filtered.unshift(template);
    history.recentTemplates = filtered.slice(0, MAX_HISTORY_ITEMS);
    this.saveHistory(history);
    return history;
  }

  /**
   * 最近実行したリネームを追加
   */
  public static addRecentRename(item: { originalName: string; newName: string; status: string }): HistoryData {
    const history = this.getHistory();
    const newItem = {
      id: `rename_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      ...item,
    };
    history.recentRenames.unshift(newItem);
    history.recentRenames = history.recentRenames.slice(0, MAX_HISTORY_ITEMS);
    this.saveHistory(history);
    return history;
  }

  /**
   * 履歴の削除
   */
  public static clearHistory(type?: 'folders' | 'templates' | 'renames'): HistoryData {
    const history = this.getHistory();
    if (!type) {
      const empty = { recentFolders: [], recentTemplates: [], recentRenames: [] };
      this.saveHistory(empty);
      return empty;
    }
    if (type === 'folders') history.recentFolders = [];
    if (type === 'templates') history.recentTemplates = [];
    if (type === 'renames') history.recentRenames = [];
    this.saveHistory(history);
    return history;
  }

  /**
   * バックアップの取得
   */
  public static getBackups(): AppBackup[] {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return [];
      const raw = localStorage.getItem(BACKUPS_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as AppBackup[];
    } catch {
      return [];
    }
  }

  /**
   * バックアップの作成
   */
  public static createBackup(
    settings: Omit<AppSettingsExport, 'version' | 'exportedAt'>,
    fileList: VideoFile[],
    note?: string
  ): AppBackup {
    const backups = this.getBackups();
    const exportedSettings: AppSettingsExport = {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      ...settings,
    };

    const newBackup: AppBackup = {
      id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
      settings: exportedSettings,
      fileList,
      note: note || `自動バックアップ (${fileList.length} 件のファイル)`,
    };

    backups.unshift(newBackup);
    const trimmed = backups.slice(0, MAX_BACKUP_ITEMS);

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(BACKUPS_KEY, JSON.stringify(trimmed));
      }
    } catch (e) {
      console.error('Failed to save backup to localStorage', e);
      throw e;
    }

    return newBackup;
  }

  /**
   * バックアップの削除
   */
  public static deleteBackup(backupId: string): AppBackup[] {
    const backups = this.getBackups().filter((b) => b.id !== backupId);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(BACKUPS_KEY, JSON.stringify(backups));
      }
    } catch (e) {
      console.error('Failed to delete backup from localStorage', e);
    }
    return backups;
  }
}

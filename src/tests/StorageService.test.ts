// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../services/StorageService';

describe('StorageService (Phase 60)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('exportSettings & parseSettingsJson', () => {
    it('should export settings to JSON string with version and timestamp', () => {
      const settings = {
        renameTemplate: '{title}',
        geminiApiKey: 'test-key',
        geminiModel: 'gemini-1.5-flash',
        geminiPromptTemplate: '',
        customRegex: 'ABC-123',
        enableScraper: true,
        enableGeminiFallback: true,
        autoExtractCode: true,
        maxConcurrentScrapes: 2,
        replacementRules: [],
      };

      const jsonStr = StorageService.exportSettings(settings);
      expect(jsonStr).toContain('"version": "1.4.0"');
      expect(jsonStr).toContain('"renameTemplate": "{title}"');

      const parsed = StorageService.parseSettingsJson(jsonStr);
      expect(parsed.renameTemplate).toBe('{title}');
      expect(parsed.geminiApiKey).toBe('test-key');
    });

    it('should throw error on invalid JSON string input', () => {
      expect(() => StorageService.parseSettingsJson('invalid json')).toThrow('インポートエラー');
    });
  });

  describe('History Management', () => {
    it('should add and retrieve recent folders', () => {
      StorageService.addRecentFolder('/path/to/folder1');
      StorageService.addRecentFolder('/path/to/folder2');

      const history = StorageService.getHistory();
      expect(history.recentFolders).toEqual(['/path/to/folder2', '/path/to/folder1']);
    });

    it('should add and retrieve recent templates', () => {
      StorageService.addRecentTemplate('{id}_{title}');
      StorageService.addRecentTemplate('{title}');

      const history = StorageService.getHistory();
      expect(history.recentTemplates).toEqual(['{title}', '{id}_{title}']);
    });

    it('should add and retrieve recent renames', () => {
      StorageService.addRecentRename({
        originalName: 'file1.mp4',
        newName: 'SSNI-001 タイトル.mp4',
        status: '成功',
      });

      const history = StorageService.getHistory();
      expect(history.recentRenames.length).toBe(1);
      expect(history.recentRenames[0].originalName).toBe('file1.mp4');
    });

    it('should clear specific history type', () => {
      StorageService.addRecentFolder('/path/1');
      StorageService.addRecentTemplate('{id}');

      StorageService.clearHistory('folders');
      const history = StorageService.getHistory();
      expect(history.recentFolders).toEqual([]);
      expect(history.recentTemplates).toEqual(['{id}']);
    });
  });

  describe('Backup & Restore', () => {
    it('should create and retrieve backups', () => {
      const settings = {
        renameTemplate: '{id}',
        geminiApiKey: '',
        geminiModel: '',
        geminiPromptTemplate: '',
        customRegex: '',
        enableScraper: true,
        enableGeminiFallback: true,
        autoExtractCode: true,
        maxConcurrentScrapes: 1,
        replacementRules: [],
      };

      const backup = StorageService.createBackup(settings, [], 'テストバックアップ');
      expect(backup.note).toBe('テストバックアップ');

      const backups = StorageService.getBackups();
      expect(backups.length).toBe(1);
      expect(backups[0].id).toBe(backup.id);
    });

    it('should delete a backup', () => {
      const settings = {
        renameTemplate: '{id}',
        geminiApiKey: '',
        geminiModel: '',
        geminiPromptTemplate: '',
        customRegex: '',
        enableScraper: true,
        enableGeminiFallback: true,
        autoExtractCode: true,
        maxConcurrentScrapes: 1,
        replacementRules: [],
      };

      const backup = StorageService.createBackup(settings, []);
      expect(StorageService.getBackups().length).toBe(1);

      const updated = StorageService.deleteBackup(backup.id);
      expect(updated.length).toBe(0);
      expect(StorageService.getBackups().length).toBe(0);
    });
  });
});

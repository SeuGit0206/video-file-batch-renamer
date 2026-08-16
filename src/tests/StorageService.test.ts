// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../services/StorageService';
import { APP_VERSION } from '../constants';

describe('StorageService (Phase 60 & Phase 74)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('exportSettings & parseSettingsJson', () => {
    it('should export settings to JSON string with current APP_VERSION and timestamp', () => {
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
      expect(jsonStr).toContain(`"version": "${APP_VERSION}"`);
      expect(jsonStr).toContain('"renameTemplate": "{title}"');

      const parsed = StorageService.parseSettingsJson(jsonStr);
      expect(parsed.version).toBe(APP_VERSION);
      expect(parsed.renameTemplate).toBe('{title}');
      expect(parsed.geminiApiKey).toBe('test-key');
    });

    it('should maintain backward compatibility when importing legacy format JSON (e.g. version 1.4.0)', () => {
      const legacyJson = JSON.stringify({
        version: '1.4.0',
        exportedAt: '2026-01-01T00:00:00.000Z',
        renameTemplate: '{id}_{title}',
        geminiApiKey: 'legacy-key',
      });

      const parsed = StorageService.parseSettingsJson(legacyJson);
      expect(parsed.version).toBe('1.4.0');
      expect(parsed.renameTemplate).toBe('{id}_{title}');
      expect(parsed.geminiApiKey).toBe('legacy-key');
    });

    it('should throw error on invalid JSON string input', () => {
      expect(() => StorageService.parseSettingsJson('invalid json')).toThrow('インポートエラー');
    });

    it('should throw error on non-object JSON input (e.g. primitive or null)', () => {
      expect(() => StorageService.parseSettingsJson('null')).toThrow('インポートエラー');
      expect(() => StorageService.parseSettingsJson('"string"')).toThrow('インポートエラー');
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
    it('should create and retrieve backups with current APP_VERSION', () => {
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
      expect(backup.settings.version).toBe(APP_VERSION);

      const backups = StorageService.getBackups();
      expect(backups.length).toBe(1);
      expect(backups[0].id).toBe(backup.id);
      expect(backups[0].settings.version).toBe(APP_VERSION);
    });

    it('should maintain max 10 backups limit when creating multiple backups', () => {
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

      for (let i = 0; i < 15; i++) {
        StorageService.createBackup(settings, [], `Backup ${i}`);
      }

      const backups = StorageService.getBackups();
      expect(backups.length).toBe(10);
      expect(backups[0].note).toBe('Backup 14');
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


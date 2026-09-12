// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BackupHistoryPanel } from '../../src/components/BackupHistoryPanel';
import { StorageService } from '../../src/services/StorageService';

const backupKey = 'vrt_app_backups';
const settings = {
  renameTemplate: '{title}',
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

function failBackupWrites() {
  const original = Storage.prototype.setItem;
  const error = new DOMException('保存容量が不足しています', 'QuotaExceededError');
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    if (key === backupKey) throw error;
    original.call(this, key, value);
  });
  return { write, error };
}

describe('バックアップ保存失敗と再試行', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('保存失敗を呼び出し元へ伝え、既存バックアップを保持する', () => {
    const previous = StorageService.createBackup(settings, [], '保存済み');
    const stored = localStorage.getItem(backupKey);
    const { write, error } = failBackupWrites();

    expect.soft(() => StorageService.createBackup(settings, [], '未保存')).toThrow(error);
    expect(write).toHaveBeenCalledWith(backupKey, expect.any(String));
    expect(localStorage.getItem(backupKey)).toBe(stored);
    expect(StorageService.getBackups()).toEqual([previous]);

    write.mockRestore();
    const retried = StorageService.createBackup(settings, [], '再試行');
    expect(StorageService.getBackups()).toEqual([retried, previous]);
  });

  it('画面で保存失敗を成功通知せず、メモと旧バックアップを保持して再試行できる', () => {
    const previous = StorageService.createBackup(settings, [], '保存済み');
    const stored = localStorage.getItem(backupKey);
    const addLog = vi.fn();
    render(<BackupHistoryPanel currentSettings={settings} files={[]}
      onImportSettings={vi.fn()} onRestoreBackup={vi.fn()} addLog={addLog} />);
    const note = screen.getByPlaceholderText('バックアップのメモ (任意)...') as HTMLInputElement;
    fireEvent.change(note, { target: { value: '今回のメモ' } });
    const { write } = failBackupWrites();
    fireEvent.click(screen.getByRole('button', { name: 'バックアップ作成' }));

    expect(write).toHaveBeenCalledWith(backupKey, expect.any(String));
    expect.soft(addLog).not.toHaveBeenCalledWith('Info', 'StorageService', expect.stringContaining('バックアップを作成しました'));
    expect.soft(addLog).toHaveBeenCalledWith('Error', 'StorageService', expect.stringContaining('バックアップ作成失敗'));
    expect.soft(note.value).toBe('今回のメモ');
    expect(screen.getByText('保存済み')).toBeTruthy();
    expect(screen.queryByText('今回のメモ')).toBeNull();
    expect(localStorage.getItem(backupKey)).toBe(stored);
    expect(StorageService.getBackups()).toEqual([previous]);

    write.mockRestore();
    addLog.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'バックアップ作成' }));
    expect(screen.getByText('今回のメモ')).toBeTruthy();
    expect(note.value).toBe('');
    expect(addLog).toHaveBeenCalledTimes(1);
    expect(addLog).toHaveBeenCalledWith('Info', 'StorageService', expect.stringContaining('バックアップを作成しました'));
    const backups = StorageService.getBackups();
    expect(backups).toHaveLength(2);
    expect(backups[0].note).toBe('今回のメモ');
    expect(backups[1]).toEqual(previous);
  });
});

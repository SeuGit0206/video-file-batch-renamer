import React, { useState, useEffect } from 'react';
import { Download, Upload, History, Database, Trash2, RotateCcw, Plus, Check, FileJson } from 'lucide-react';
import { StorageService } from '../services/StorageService';
import type { AppBackup, HistoryData, VideoFile } from '../types';

interface BackupHistoryPanelProps {
  currentSettings: {
    renameTemplate: string;
    geminiApiKey: string;
    geminiModel: string;
    geminiPromptTemplate: string;
    customRegex: string;
    enableScraper: boolean;
    enableGeminiFallback: boolean;
    autoExtractCode: boolean;
    maxConcurrentScrapes: number;
    replacementRules: Array<{ search: string; replace: string }>;
  };
  onImportSettings: (settings: Record<string, unknown>) => void;
  files: VideoFile[];
  onRestoreBackup: (backup: AppBackup) => void;
  addLog: (level: 'Debug' | 'Info' | 'Warning' | 'Error', source: string, message: string) => void;
}

export const BackupHistoryPanel: React.FC<BackupHistoryPanelProps> = ({
  currentSettings,
  onImportSettings,
  files,
  onRestoreBackup,
  addLog,
}) => {
  const [history, setHistory] = useState<HistoryData>({ recentFolders: [], recentTemplates: [], recentRenames: [] });
  const [backups, setBackups] = useState<AppBackup[]>([]);
  const [backupNote, setBackupNote] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    setHistory(StorageService.getHistory());
    setBackups(StorageService.getBackups());
  }, []);

  const handleExportSettings = () => {
    try {
      const jsonStr = StorageService.exportSettings(currentSettings);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video_renamer_settings_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addLog('Info', 'StorageService', '設定JSONファイルをエクスポートしました。');
    } catch (e) {
      addLog('Error', 'StorageService', `エクスポート失敗: ${e instanceof Error ? e.message : '不明なエラー'}`);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = StorageService.parseSettingsJson(content);
        onImportSettings(imported);
        setImportStatus('設定を正常にインポートしました');
        addLog('Info', 'StorageService', '設定JSONを正常に読み込み・適用しました。');
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'インポートエラー';
        setImportStatus(`失敗: ${msg}`);
        addLog('Error', 'StorageService', msg);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCreateBackup = () => {
    try {
      const newBackup = StorageService.createBackup(currentSettings, files, backupNote.trim() || undefined);
      setBackups(StorageService.getBackups());
      setBackupNote('');
      addLog('Info', 'StorageService', `手動バックアップを作成しました (${newBackup.fileList.length} 件のファイル)`);
    } catch (e) {
      addLog('Error', 'StorageService', `バックアップ作成失敗: ${e instanceof Error ? e.message : '不明'}`);
    }
  };

  const handleDeleteBackup = (id: string) => {
    const updated = StorageService.deleteBackup(id);
    setBackups(updated);
    addLog('Info', 'StorageService', 'バックアップを削除しました。');
  };

  const handleClearHistorySection = (type?: 'folders' | 'templates' | 'renames') => {
    const updated = StorageService.clearHistory(type);
    setHistory(updated);
    addLog('Info', 'StorageService', `履歴 (${type || 'すべて'}) をクリアしました。`);
  };

  return (
    <div className="bg-white border border-[#141414] p-4 rounded-none shadow-none flex flex-col gap-4">
      <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#141414]/60 flex items-center gap-1.5">
        <Database className="w-4 h-4 text-[#141414]" />
        設定管理・履歴・バックアップ (Phase60)
      </h3>

      {/* 設定インポート / エクスポート */}
      <div className="border border-[#141414]/20 p-3 bg-[#F0EFED]">
        <div className="text-xs font-bold text-[#141414] mb-2 flex items-center gap-1.5">
          <FileJson className="w-4 h-4" />
          設定 JSON インポート / エクスポート
        </div>
        <p className="text-[11px] text-[#141414]/70 mb-3">
          リネームテンプレート、Gemini設定、正規表現設定などをJSON形式でバックアップ・復元できます。
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={handleExportSettings}
            className="bg-[#141414] hover:bg-[#333] text-white text-xs px-3 py-1.5 font-bold flex items-center gap-1.5 rounded-none cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            設定JSON出力
          </button>
          <label className="bg-white border border-[#141414] hover:bg-gray-100 text-[#141414] text-xs px-3 py-1.5 font-bold flex items-center gap-1.5 rounded-none cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            設定JSON読み込み
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
          {importStatus && (
            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> {importStatus}
            </span>
          )}
        </div>
      </div>

      {/* バックアップ作成・復元 */}
      <div className="border border-[#141414]/20 p-3 bg-white">
        <div className="text-xs font-bold text-[#141414] mb-2 flex items-center gap-1.5">
          <RotateCcw className="w-4 h-4" />
          状態バックアップ & ポイント復元
        </div>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={backupNote}
            onChange={(e) => setBackupNote(e.target.value)}
            placeholder="バックアップのメモ (任意)..."
            className="flex-1 border border-[#141414] px-2 py-1 text-xs outline-none"
          />
          <button
            type="button"
            onClick={handleCreateBackup}
            className="bg-[#141414] hover:bg-[#333] text-white text-xs px-3 py-1 font-bold flex items-center gap-1 rounded-none cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            バックアップ作成
          </button>
        </div>

        {backups.length === 0 ? (
          <p className="text-[11px] text-[#141414]/50 italic">作成されたバックアップはありません</p>
        ) : (
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {backups.map((b) => (
              <div key={b.id} className="flex items-center justify-between border border-[#141414]/10 p-2 text-xs bg-gray-50">
                <div className="truncate pr-2">
                  <div className="font-bold text-[#141414]">
                    {b.note || '自動バックアップ'}
                    <span className="font-normal text-[#141414]/60 text-[10px] ml-2">
                      ({new Date(b.createdAt).toLocaleString()})
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    ファイル数: {b.fileList.length} 件 | テンプレート: {b.settings.renameTemplate}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onRestoreBackup(b);
                      addLog('Info', 'StorageService', `バックアップ [${b.note || b.id}] に復元しました。`);
                    }}
                    className="bg-[#141414] text-white text-[10px] px-2 py-1 font-bold hover:bg-gray-800 rounded-none cursor-pointer"
                  >
                    復元
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBackup(b.id)}
                    className="text-red-600 hover:text-red-800 p-1 rounded-none cursor-pointer"
                    title="削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 履歴管理 */}
      <div className="border border-[#141414]/20 p-3 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
            <History className="w-4 h-4" />
            アクティビティ履歴管理
          </div>
          <button
            type="button"
            onClick={() => handleClearHistorySection()}
            className="text-[10px] text-red-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"
          >
            <Trash2 className="w-3 h-3" /> 全履歴消去
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* 最近使用したテンプレート */}
          <div className="border border-[#141414]/10 p-2 bg-gray-50">
            <div className="flex justify-between items-center mb-1 font-bold text-[11px] text-[#141414]">
              <span>最近使用したテンプレート ({history.recentTemplates.length})</span>
              <button
                type="button"
                onClick={() => handleClearHistorySection('templates')}
                className="text-[9px] text-red-600 hover:underline"
              >
                消去
              </button>
            </div>
            {history.recentTemplates.length === 0 ? (
              <span className="text-[10px] text-gray-400 italic">履歴なし</span>
            ) : (
              <ul className="space-y-1 max-h-24 overflow-y-auto">
                {history.recentTemplates.map((t, idx) => (
                  <li key={idx} className="font-mono text-[10.5px] truncate text-gray-700 bg-white px-1.5 py-0.5 border border-gray-200">
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 最近実行したリネーム */}
          <div className="border border-[#141414]/10 p-2 bg-gray-50">
            <div className="flex justify-between items-center mb-1 font-bold text-[11px] text-[#141414]">
              <span>最近のリネーム実行 ({history.recentRenames.length})</span>
              <button
                type="button"
                onClick={() => handleClearHistorySection('renames')}
                className="text-[9px] text-red-600 hover:underline"
              >
                消去
              </button>
            </div>
            {history.recentRenames.length === 0 ? (
              <span className="text-[10px] text-gray-400 italic">履歴なし</span>
            ) : (
              <ul className="space-y-1 max-h-24 overflow-y-auto">
                {history.recentRenames.map((r) => (
                  <li key={r.id} className="text-[10px] truncate text-gray-700 bg-white px-1.5 py-0.5 border border-gray-200">
                    <span className="font-mono font-semibold">{r.originalName}</span> &rarr; <span className="font-mono text-emerald-700">{r.newName}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

BackupHistoryPanel.displayName = 'BackupHistoryPanel';

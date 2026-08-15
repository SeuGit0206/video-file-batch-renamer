import React, { useState, useEffect, useCallback } from 'react';
import { Save, Download, Trash2, Bookmark, AlertCircle, CheckCircle } from 'lucide-react';
import type { RulePreset, RuleDefinition } from '../../types/rule';
import type { RulePresetService } from '../../services/rule/RulePresetService';

export interface RulePresetPanelProps {
  presetService: RulePresetService;
  currentRules: RuleDefinition[];
  onLoadPreset: (preset: RulePreset) => void;
  onPresetSaved?: (preset: RulePreset) => void;
}

export const RulePresetPanel: React.FC<RulePresetPanelProps> = React.memo(({
  presetService,
  currentRules,
  onLoadPreset,
  onPresetSaved,
}) => {
  const [presets, setPresets] = useState<RulePreset[]>([]);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [newPresetDescription, setNewPresetDescription] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // プリセット一覧の再読み込み
  const reloadPresets = useCallback(() => {
    const res = presetService.getPresets();
    if (res.success && res.data) {
      setPresets(res.data);
    } else {
      setPresets([]);
      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      }
    }
  }, [presetService]);

  useEffect(() => {
    reloadPresets();
  }, [reloadPresets]);

  // 現在のルールを新規プリセットとして保存
  const handleSavePreset = useCallback(() => {
    setMessage(null);
    if (!newPresetName.trim()) {
      setMessage({ type: 'error', text: 'プリセット名を入力してください。' });
      return;
    }

    const presetId = `preset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newPreset: RulePreset = {
      presetId,
      name: newPresetName.trim(),
      description: newPresetDescription.trim() || undefined,
      enabled: true,
      rules: currentRules,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = presetService.savePreset(newPreset);
    if (res.success) {
      setMessage({ type: 'success', text: `プリセット "${newPreset.name}" を保存しました。` });
      setNewPresetName('');
      setNewPresetDescription('');
      reloadPresets();
      onPresetSaved?.(newPreset);
    } else {
      setMessage({ type: 'error', text: res.error || 'プリセットの保存に失敗しました。' });
    }
  }, [currentRules, newPresetDescription, newPresetName, onPresetSaved, presetService, reloadPresets]);

  // プリセット削除
  const handleDeletePreset = useCallback((presetId: string, name: string) => {
    setMessage(null);
    const res = presetService.deletePreset(presetId);
    if (res.success) {
      setMessage({ type: 'success', text: `プリセット "${name}" を削除しました。` });
      reloadPresets();
    } else {
      setMessage({ type: 'error', text: res.error || '削除に失敗しました。' });
    }
  }, [presetService, reloadPresets]);

  // プリセット読み込み
  const handleLoadPreset = useCallback((preset: RulePreset) => {
    setMessage({ type: 'success', text: `プリセット "${preset.name}" を読み込みました。` });
    onLoadPreset(preset);
  }, [onLoadPreset]);

  return (
    <div className="flex flex-col gap-4 text-xs font-sans">
      {/* メッセージ表示 */}
      {message && (
        <div
          className={`p-2.5 rounded border text-xs flex items-center gap-1.5 ${
            message.type === 'success'
              ? 'bg-green-50 border-green-300 text-green-800'
              : 'bg-red-50 border-red-300 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 現在のルールを保存 */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded flex flex-col gap-2">
        <h4 className="font-bold text-gray-800 flex items-center gap-1">
          <Save className="w-3.5 h-3.5 text-indigo-600" />
          現在のルールセットをプリセット保存
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            placeholder="プリセット名 *"
            className="p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 bg-white"
          />
          <input
            type="text"
            value={newPresetDescription}
            onChange={(e) => setNewPresetDescription(e.target.value)}
            placeholder="説明 (任意)"
            className="p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 bg-white"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSavePreset}
            disabled={!newPresetName.trim()}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded cursor-pointer disabled:opacity-50"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>保存</span>
          </button>
        </div>
      </div>

      {/* 登録済みプリセット一覧 */}
      <div className="flex flex-col gap-2">
        <h4 className="font-bold text-gray-800">保存済みプリセット一覧 ({presets.length}件)</h4>
        {presets.length === 0 ? (
          <div className="p-4 border border-gray-200 rounded text-center text-gray-500 bg-gray-50">
            保存されたプリセットがありません。
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1">
            {presets.map((preset) => (
              <div
                key={preset.presetId}
                className="p-2.5 bg-white border border-gray-300 rounded flex items-center justify-between gap-2 hover:border-indigo-300 transition-colors"
              >
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 truncate">{preset.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-mono">
                      ルール {preset.rules.length}件
                    </span>
                  </div>
                  {preset.description && (
                    <span className="text-[11px] text-gray-500 truncate mt-0.5">{preset.description}</span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleLoadPreset(preset)}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded border border-gray-300 cursor-pointer"
                    title="このプリセットを適用"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>読込</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePreset(preset.presetId, preset.name)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                    title="プリセット削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

RulePresetPanel.displayName = 'RulePresetPanel';

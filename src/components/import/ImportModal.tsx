import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Settings2, X, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import type {
  ImportData,
  ImportDiffInfo,
  ImportDiffField,
  ImportItemDiff,
  ImportFormat,
  ImportMode,
  ImportOptions,
  ImportResult,
  ImportTarget,
  ImportValidationResult,
} from '../../types/import';
import type { ImportStrategyFactory } from '../../services/import/ImportStrategyFactory';
import type { ImportValidationPolicy } from '../../policies/ImportValidationPolicy';
import { container } from '../../composition/container';
import { ImportDiffViewer } from './ImportDiffViewer';

export interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (result: ImportResult) => void;
  onImportError?: (error: Error) => void;
  importFactory?: typeof ImportStrategyFactory;
  validationPolicy?: typeof ImportValidationPolicy;
  getCurrentDataForTarget?: (target: ImportTarget) => Promise<Record<string, unknown>[] | Record<string, unknown> | null>;
}

const TARGET_OPTIONS: { value: ImportTarget; label: string; description: string }[] = [
  { value: 'history', label: '処理履歴 (History)', description: 'リネーム・変換実施ログデータ' },
  { value: 'metadata', label: 'メタデータ (Metadata)', description: '抽出済みの動画情報' },
  { value: 'logs', label: 'システムログ (Logs)', description: 'エラー・診断ログ' },
  { value: 'settings', label: '設定情報 (Settings)', description: 'アプリ動作設定 (JSON対応)' },
  { value: 'presets', label: 'プリセット (Presets)', description: 'テンプレート・パターン定義' },
];

const FORMAT_OPTIONS: { value: ImportFormat; label: string }[] = [
  { value: 'json', label: 'JSON (.json)' },
  { value: 'csv', label: 'CSV (.csv)' },
];

const MODE_OPTIONS: { value: ImportMode; label: string; description: string }[] = [
  { value: 'merge', label: '統合 (Merge)', description: '既存データを維持しつつ新データを結合' },
  { value: 'overwrite', label: '上書き (Overwrite)', description: '既存データを完全に置き換え' },
  { value: 'skip', label: '重複スキップ (Skip)', description: '既存IDと重複するデータは無視' },
];

/**
 * データインポートモーダルコンポーネント
 */
export const ImportModal: React.FC<ImportModalProps> = React.memo(({
  isOpen,
  onClose,
  onImportComplete,
  onImportError,
  importFactory,
  validationPolicy,
  getCurrentDataForTarget,
}) => {
  const factory = importFactory || container.getImportStrategyFactory();
  const policy = validationPolicy || container.getImportValidationPolicy();

  const [target, setTarget] = useState<ImportTarget>('history');
  const [format, setFormat] = useState<ImportFormat>('json');
  const [mode, setMode] = useState<ImportMode>('merge');

  const [rawTextContent, setRawTextContent] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [parsedData, setParsedData] = useState<ImportData | null>(null);
  const [diffInfo, setDiffInfo] = useState<ImportDiffInfo | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const [activeStep, setActiveStep] = useState<'upload' | 'preview' | 'success'>('upload');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ターゲット変更ハンドラ
  const handleTargetChange = useCallback((newTarget: ImportTarget) => {
    setTarget(newTarget);
    setErrorMessage(null);
    setValidationResult(null);
    setParsedData(null);
    setDiffInfo(null);
    
    // ターゲットが対応しているか確認
    const service = factory.getService(format);
    if (!service.supportsTarget(newTarget)) {
      setFormat('json');
    }
  }, [factory, format]);

  // ファイル読み込み処理
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setErrorMessage(null);

    // 拡張子からフォーマット推測
    if (file.name.endsWith('.csv')) {
      setFormat('csv');
    } else if (file.name.endsWith('.json')) {
      setFormat('json');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setRawTextContent(text);
      }
    };
    reader.onerror = () => {
      setErrorMessage('ファイルの読み込みに失敗しました。');
    };
    reader.readAsText(file);
  }, []);

  // 差分計算ヘルパー
  const calculateDiff = useCallback(async (
    data: ImportData,
    currentData: Record<string, unknown>[] | Record<string, unknown> | null
  ): Promise<ImportDiffInfo> => {
    const items = data.items || [];
    if (!currentData) {
      return {
        totalChanges: items.length,
        addedCount: items.length,
        modifiedCount: 0,
        removedCount: 0,
        unchangedCount: 0,
        itemDiffs: items.map((item, idx) => ({
          id: String(item.id || item.key || `item-${idx}`),
          status: 'added',
          fields: Object.entries(item).map(([field, newValue]) => ({
            field,
            oldValue: undefined,
            newValue,
            status: 'added' as const,
          })),
        })),
      };
    }

    const existingArray = Array.isArray(currentData) ? currentData : [currentData];
    const existingMap = new Map<string, Record<string, unknown>>();
    existingArray.forEach((ex, idx) => {
      const key = String(ex.id || ex.key || `ex-${idx}`);
      existingMap.set(key, ex);
    });

    let addedCount = 0;
    let modifiedCount = 0;
    let unchangedCount = 0;
    const itemDiffs: ImportItemDiff[] = [];

    items.forEach((item, idx) => {
      const itemId = String(item.id || item.key || `item-${idx}`);
      const existingItem = existingMap.get(itemId);

      if (!existingItem) {
        addedCount++;
        itemDiffs.push({
          id: itemId,
          status: 'added',
          fields: Object.entries(item).map(([field, newValue]) => ({
            field,
            oldValue: undefined,
            newValue,
            status: 'added',
          })),
        });
      } else {
        const fieldDiffs: ImportDiffField[] = [];
        let isModified = false;

        const allKeys = new Set([...Object.keys(existingItem), ...Object.keys(item)]);
        allKeys.forEach((k) => {
          const oldVal = existingItem[k];
          const newVal = item[k];
          if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            isModified = true;
            fieldDiffs.push({
              field: k,
              oldValue: oldVal,
              newValue: newVal,
              status: 'modified',
            });
          }
        });

        if (isModified) {
          modifiedCount++;
          itemDiffs.push({
            id: itemId,
            status: 'modified',
            fields: fieldDiffs,
          });
        } else {
          unchangedCount++;
          itemDiffs.push({
            id: itemId,
            status: 'unchanged',
            fields: [],
          });
        }
      }
    });

    const totalChanges = addedCount + modifiedCount;

    return {
      totalChanges,
      addedCount,
      modifiedCount,
      removedCount: 0,
      unchangedCount,
      itemDiffs,
    };
  }, []);

  // パース & プレビュー検証
  const handleParseAndPreview = useCallback(async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);

      if (!rawTextContent.trim()) {
        throw new Error('インポートするファイルを選択するか、データテキストを入力してください。');
      }

      const service = factory.getService(format);
      if (!service.supportsTarget(target)) {
        throw new Error(`フォーマット "${format.toUpperCase()}" はターゲット "${target}" に対応していません。`);
      }

      const parsed = await service.parse(rawTextContent, { target, format, mode });
      setParsedData(parsed);

      const valRes = policy.validateData(parsed, { format, target, mode });
      setValidationResult(valRes);

      if (!valRes.isValid) {
        setErrorMessage(`データの検証に失敗しました:\n${valRes.errors.join('\n')}`);
        return;
      }

      let currentData: Record<string, unknown>[] | Record<string, unknown> | null = null;
      if (getCurrentDataForTarget) {
        currentData = await getCurrentDataForTarget(target);
      }

      const computedDiff = valRes.diff || await calculateDiff(parsed, currentData);
      setDiffInfo(computedDiff);

      setActiveStep('preview');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setErrorMessage(error.message);
      onImportError?.(error);
    } fontally: {
      setIsProcessing(false);
    }
  }, [calculateDiff, factory, format, getCurrentDataForTarget, mode, onImportError, policy, rawTextContent, target]);

  // インポート確定処理
  const handleExecuteImport = useCallback(async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);

      if (!parsedData) {
        throw new Error('パース済みデータが存在しません。');
      }

      const service = factory.getService(format);
      const options: Partial<ImportOptions> = {
        format,
        target,
        mode,
        allowPartialSuccess: true,
      };

      const result = await service.importData(parsedData, options);

      setImportResult(result);

      if (!result.success) {
        throw new Error(result.errors.join('\n') || 'インポートの実行に失敗しました。');
      }

      onImportComplete?.(result);
      setActiveStep('success');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setErrorMessage(error.message);
      onImportError?.(error);
    } finally {
      setIsProcessing(false);
    }
  }, [factory, format, mode, onImportComplete, onImportError, parsedData, target]);

  // リセット・クローズ処理
  const handleResetAndClose = useCallback(() => {
    setRawTextContent('');
    setSelectedFileName(null);
    setErrorMessage(null);
    setValidationResult(null);
    setParsedData(null);
    setDiffInfo(null);
    setImportResult(null);
    setActiveStep('upload');
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-[#141414] max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 font-sans max-h-[90vh] overflow-y-auto">
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between border-b border-[#141414]/20 pb-3">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-base text-[#141414]">データインポート</h2>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            disabled={isProcessing}
            className="text-[#141414] hover:bg-[#141414] hover:text-white p-1 border border-[#141414] text-xs font-bold cursor-pointer disabled:opacity-50"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* エラーメッセージ */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-300 text-red-700 text-xs rounded flex items-start gap-2 whitespace-pre-wrap">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ステップ1: アップロード・設定画面 */}
        {activeStep === 'upload' && (
          <>
            {/* インポート対象選択 */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="import-target-select" className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                インポート対象
              </label>
              <select
                id="import-target-select"
                value={target}
                onChange={(e) => handleTargetChange(e.target.value as ImportTarget)}
                disabled={isProcessing}
                className="w-full p-2 border border-gray-300 text-xs rounded focus:ring-1 focus:ring-indigo-500 bg-white"
              >
                {TARGET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} - {opt.description}
                  </option>
                ))}
              </select>
            </div>

            {/* フォーマット選択 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700">ソースフォーマット</label>
              <div className="grid grid-cols-2 gap-2">
                {FORMAT_OPTIONS.map((opt) => {
                  const supported = factory.getService(opt.value).supportsTarget(target);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={!supported || isProcessing}
                      onClick={() => {
                        setFormat(opt.value);
                        setErrorMessage(null);
                      }}
                      className={`p-2 border text-xs font-medium rounded text-center transition-colors cursor-pointer ${
                        format === opt.value
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      } ${!supported ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* インポートモード選択 */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="import-mode-select" className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <Settings2 className="w-3.5 h-3.5" />
                インポートモード
              </label>
              <select
                id="import-mode-select"
                value={mode}
                onChange={(e) => setMode(e.target.value as ImportMode)}
                disabled={isProcessing}
                className="w-full p-2 border border-gray-300 text-xs rounded focus:ring-1 focus:ring-indigo-500 bg-white"
              >
                {MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} - {opt.description}
                  </option>
                ))}
              </select>
            </div>

            {/* ファイル選択エリア */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100">
              <label htmlFor="file-upload-input" className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                データファイルの選択
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="file-upload-input"
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv,.txt"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded border border-gray-300 cursor-pointer disabled:opacity-50"
                >
                  ファイルを選択...
                </button>
                <span className="text-xs text-gray-600 truncate max-w-[250px]">
                  {selectedFileName || 'ファイルが選択されていません'}
                </span>
              </div>
            </div>

            {/* またはテキスト直接入力 */}
            <div className="flex flex-col gap-1">
              <label htmlFor="raw-text-textarea" className="text-[11px] text-gray-600">またはデータを直接貼り付け ({format.toUpperCase()})</label>
              <textarea
                id="raw-text-textarea"
                rows={4}
                value={rawTextContent}
                onChange={(e) => setRawTextContent(e.target.value)}
                placeholder={format === 'json' ? '[{"id": "1", "name": "サンプル"}]' : 'id,name\n1,サンプル'}
                disabled={isProcessing}
                className="w-full p-2 border border-gray-300 text-xs font-mono rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* フッターアクション */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 mt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold rounded border border-gray-300 cursor-pointer disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleParseAndPreview}
                disabled={isProcessing || !rawTextContent.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded cursor-pointer disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isProcessing ? '解析中...' : 'プレビュー & 差分確認'}</span>
              </button>
            </div>
          </>
        )}

        {/* ステップ2: プレビュー & 差分確認 */}
        {activeStep === 'preview' && (
          <>
            {validationResult?.warnings && validationResult.warnings.length > 0 && (
              <div className="p-2.5 bg-amber-50 border border-amber-300 text-amber-800 text-xs rounded flex flex-col gap-1">
                <span className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  注意事項 (警告)
                </span>
                <ul className="list-disc pl-4 text-[11px] space-y-0.5">
                  {validationResult.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <ImportDiffViewer
              diffInfo={diffInfo}
              onConfirm={handleExecuteImport}
              onCancel={() => setActiveStep('upload')}
              isProcessing={isProcessing}
            />
          </>
        )}

        {/* ステップ3: インポート完了 */}
        {activeStep === 'success' && importResult && (
          <div className="flex flex-col gap-4 text-center py-2">
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="w-10 h-10 text-green-600" />
              <h3 className="font-bold text-base text-gray-800">インポートが完了しました</h3>
            </div>

            <div className="p-3 bg-green-50 border border-green-200 rounded text-xs text-green-900 flex flex-col gap-1 text-left">
              <div><span className="font-bold">ターゲット:</span> {importResult.target}</div>
              <div><span className="font-bold">フォーマット:</span> {importResult.format.toUpperCase()}</div>
              <div><span className="font-bold">成功件数:</span> {importResult.importedCount} 件</div>
              {importResult.failedCount > 0 && (
                <div className="text-red-700"><span className="font-bold">失敗件数:</span> {importResult.failedCount} 件</div>
              )}
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded cursor-pointer"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

ImportModal.displayName = 'ImportModal';

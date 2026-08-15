import React, { useState, useCallback } from 'react';
import { Download, Eye, X, Settings2, FileText } from 'lucide-react';
import type { ExportData, ExportFormat, ExportOptions, ExportResult, ExportTarget } from '../../types/export';
import { ExportStrategyFactory } from '../../services/export/ExportStrategyFactory';
import { PreviewDialog } from './PreviewDialog';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  getDataForTarget?: (target: ExportTarget) => ExportData | Promise<ExportData>;
  onExportSuccess?: (result: ExportResult) => void;
  onExportError?: (error: Error) => void;
}

const TARGET_OPTIONS: { value: ExportTarget; label: string; description: string }[] = [
  { value: 'history', label: '処理履歴 (History)', description: 'リネーム・変換の実施履歴ログ' },
  { value: 'metadata', label: 'メタデータ (Metadata)', description: '抽出済みの動画メタデータ情報' },
  { value: 'logs', label: 'システムログ (Logs)', description: 'システムエラー・診断ログ' },
  { value: 'settings', label: '設定情報 (Settings)', description: 'アプリの設定パラメータ (JSONのみ対応)' },
  { value: 'statistics', label: '統計データ (Statistics)', description: '処理成功率・速度などの集計指標' },
];

const FORMAT_OPTIONS: { value: ExportFormat; label: string; mime: string }[] = [
  { value: 'csv', label: 'CSV (.csv)', mime: 'text/csv' },
  { value: 'json', label: 'JSON (.json)', mime: 'application/json' },
  { value: 'html', label: 'HTML レポート (.html)', mime: 'text/html' },
];

/**
 * データエクスポートモーダルコンポーネント
 */
export const ExportModal: React.FC<ExportModalProps> = React.memo(({
  isOpen,
  onClose,
  getDataForTarget,
  onExportSuccess,
  onExportError,
}) => {
  const [target, setTarget] = useState<ExportTarget>('history');
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [filename, setFilename] = useState<string>('');
  const [includeHeaders, setIncludeHeaders] = useState<boolean>(true);
  const [sanitizeOutput, setSanitizeOutput] = useState<boolean>(true);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // プレビュー状態
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewFilename, setPreviewFilename] = useState<string>('');
  const [previewSizeBytes, setPreviewSizeBytes] = useState<number | undefined>(undefined);

  // フォーマット対応可否チェック
  const service = ExportStrategyFactory.getService(format);
  const isTargetSupported = service.supportsTarget(target);

  // ターゲット変更時に未対応フォーマットなら自動調整
  const handleTargetChange = useCallback((newTarget: ExportTarget) => {
    setTarget(newTarget);
    setErrorMessage(null);
    const checkService = ExportStrategyFactory.getService(format);
    if (!checkService.supportsTarget(newTarget)) {
      setFormat('json');
    }
  }, [format]);

  // データ取得ヘルパー
  const fetchExportData = useCallback(async (selectedTarget: ExportTarget): Promise<ExportData> => {
    if (getDataForTarget) {
      return await getDataForTarget(selectedTarget);
    }
    // デフォルトのサンプル/空構造
    return {
      title: `${selectedTarget}_export`,
      exportedAt: new Date().toISOString(),
      items: [],
    };
  }, [getDataForTarget]);

  // プレビュー実行
  const handlePreview = useCallback(async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const exportService = ExportStrategyFactory.getService(format);
      if (!exportService.supportsTarget(target)) {
        throw new Error(`フォーマット "${format.toUpperCase()}" は "${target}" のエクスポートに対応していません。`);
      }

      const data = await fetchExportData(target);
      const options: Partial<ExportOptions> = {
        format,
        target,
        filename: filename.trim() || undefined,
        includeHeaders,
        sanitizeOutput,
      };

      const result = await exportService.exportData(data, options);

      if (!result.success) {
        throw new Error(result.errorMessage || 'プレビューの生成に失敗しました。');
      }

      setPreviewContent(result.content || '');
      setPreviewFilename(result.filename);
      setPreviewSizeBytes(result.sizeBytes);
      setIsPreviewOpen(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setErrorMessage(error.message);
      onExportError?.(error);
    } finally {
      setIsProcessing(false);
    }
  }, [fetchExportData, filename, format, includeHeaders, onExportError, sanitizeOutput, target]);

  // エクスポート実行 (ファイルダウンロード)
  const handleExport = useCallback(async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const exportService = ExportStrategyFactory.getService(format);
      if (!exportService.supportsTarget(target)) {
        throw new Error(`フォーマット "${format.toUpperCase()}" は "${target}" のエクスポートに対応していません。`);
      }

      const data = await fetchExportData(target);
      const options: Partial<ExportOptions> = {
        format,
        target,
        filename: filename.trim() || undefined,
        includeHeaders,
        sanitizeOutput,
      };

      const result = await exportService.exportData(data, options);

      if (!result.success) {
        throw new Error(result.errorMessage || 'エクスポートに失敗しました。');
      }

      // ファイルダウンロード処理
      if (result.blob) {
        const url = URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      onExportSuccess?.(result);
      onClose();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setErrorMessage(error.message);
      onExportError?.(error);
    } finally {
      setIsProcessing(false);
    }
  }, [fetchExportData, filename, format, includeHeaders, onClose, onExportError, onExportSuccess, sanitizeOutput, target]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
        <div className="bg-white border-2 border-[#141414] max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 font-sans max-h-[90vh] overflow-y-auto">
          {/* モーダルヘッダー */}
          <div className="flex items-center justify-between border-b border-[#141414]/20 pb-3">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-base text-[#141414]">データエクスポート</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="text-[#141414] hover:bg-[#141414] hover:text-white p-1 border border-[#141414] text-xs font-bold cursor-pointer disabled:opacity-50"
              aria-label="閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* エラーメッセージ表示 */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-700 text-xs rounded">
              {errorMessage}
            </div>
          )}

          {/* 対象選択 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="export-target-select" className="text-xs font-bold text-gray-700 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              エクスポート対象
            </label>
            <select
              id="export-target-select"
              value={target}
              onChange={(e) => handleTargetChange(e.target.value as ExportTarget)}
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

          {/* 出力形式選択 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700">出力形式 (フォーマット)</label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((opt) => {
                const supported = ExportStrategyFactory.getService(opt.value).supportsTarget(target);
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
            {!isTargetSupported && (
              <p className="text-[11px] text-amber-600">
                選択中のターゲット「{target}」はフォーマット「{format.toUpperCase()}」に未対応のため、JSONに変更されます。
              </p>
            )}
          </div>

          {/* オプション設定 */}
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
              <Settings2 className="w-3.5 h-3.5" />
              オプション設定
            </label>

            <div className="flex flex-col gap-1.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHeaders}
                  onChange={(e) => setIncludeHeaders(e.target.checked)}
                  disabled={isProcessing || format === 'json'}
                  className="rounded text-indigo-600"
                />
                <span className={format === 'json' ? 'text-gray-400' : 'text-gray-700'}>
                  ヘッダー行を含める (CSV / HTML)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sanitizeOutput}
                  onChange={(e) => setSanitizeOutput(e.target.checked)}
                  disabled={isProcessing || format !== 'csv'}
                  className="rounded text-indigo-600"
                />
                <span className={format !== 'csv' ? 'text-gray-400' : 'text-gray-700'}>
                  CSV Formula Injection 対策を有効化 (CSVのみ)
                </span>
              </label>
            </div>

            {/* カスタムファイル名 */}
            <div className="flex flex-col gap-1 mt-1">
              <label className="text-[11px] text-gray-600">カスタムファイル名 (任意)</label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder={`例: custom_${target}.${format}`}
                disabled={isProcessing}
                className="w-full p-2 border border-gray-300 text-xs rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200 mt-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={isProcessing || !isTargetSupported}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded border border-gray-300 cursor-pointer disabled:opacity-50"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>プレビュー</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold rounded border border-gray-300 cursor-pointer disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={isProcessing || !isTargetSupported}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isProcessing ? '処理中...' : 'エクスポート'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* プレビューダイアログ */}
      <PreviewDialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        content={previewContent}
        format={format}
        filename={previewFilename}
        sizeBytes={previewSizeBytes}
      />
    </>
  );
});

ExportModal.displayName = 'ExportModal';

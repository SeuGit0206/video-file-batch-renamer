import React from 'react';
import { Eye, X } from 'lucide-react';
import type { ExportFormat } from '../../types/export';

export interface PreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  format: ExportFormat;
  filename?: string;
  sizeBytes?: number;
}

/**
 * エクスポートプレビューダイアログコンポーネント (読み取り専用)
 */
export const PreviewDialog: React.FC<PreviewDialogProps> = React.memo(({
  isOpen,
  onClose,
  content,
  format,
  filename,
  sizeBytes,
}) => {
  if (!isOpen) return null;

  const formattedSize = sizeBytes
    ? `${(sizeBytes / 1024).toFixed(1)} KB (${sizeBytes.toLocaleString()} bytes)`
    : undefined;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-[#141414] max-w-2xl w-full p-5 shadow-2xl flex flex-col gap-4 font-sans max-h-[85vh]">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-[#141414]/20 pb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm text-[#141414] uppercase tracking-wide">
              エクスポートプレビュー ({format.toUpperCase()})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#141414] hover:bg-[#141414] hover:text-white p-1 border border-[#141414] text-xs font-bold cursor-pointer"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ファイル情報 */}
        {filename && (
          <div className="flex flex-wrap justify-between items-center text-xs text-gray-600 bg-gray-50 p-2 border border-gray-200 gap-2">
            <span className="font-mono">ファイル名: {filename}</span>
            {formattedSize && <span>推定サイズ: {formattedSize}</span>}
          </div>
        )}

        {/* プレビュー表示領域 (読み取り専用) */}
        <div className="flex-1 overflow-auto bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs leading-relaxed max-h-[50vh] whitespace-pre">
          {content || '(プレビューデータがありません)'}
        </div>

        {/* フッター */}
        <div className="flex justify-end pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold cursor-pointer border border-gray-400"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
});

PreviewDialog.displayName = 'PreviewDialog';

import React from 'react';
import { PlusCircle, Edit3, Trash2, CheckCircle2, AlertCircle, FileCode } from 'lucide-react';
import type { ImportDiffInfo, ImportDiffField, ImportItemDiff } from '../../types/import';

export interface ImportDiffViewerProps {
  diffInfo?: ImportDiffInfo | null;
  onConfirm?: () => void;
  onCancel?: () => void;
  isProcessing?: boolean;
}

const renderStatusBadge = (status: 'added' | 'modified' | 'removed' | 'unchanged') => {
  switch (status) {
    case 'added':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-green-100 text-green-800 border border-green-300">
          <PlusCircle className="w-3 h-3" />
          追加
        </span>
      );
    case 'modified':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-300">
          <Edit3 className="w-3 h-3" />
          変更
        </span>
      );
    case 'removed':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-800 border border-red-300">
          <Trash2 className="w-3 h-3" />
          削除
        </span>
      );
    case 'unchanged':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-700 border border-gray-300">
          <CheckCircle2 className="w-3 h-3" />
          変更なし
        </span>
      );
  }
};

const formatValue = (val: unknown): string => {
  if (val === undefined) return '(なし)';
  if (val === null) return 'null';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
};

export const ImportDiffViewer: React.FC<ImportDiffViewerProps> = React.memo(({
  diffInfo,
  onConfirm,
  onCancel,
  isProcessing = false,
}) => {
  if (!diffInfo) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded text-center text-xs text-gray-500 flex flex-col items-center gap-1">
        <AlertCircle className="w-5 h-5 text-gray-400" />
        <span>差分情報がありません。</span>
      </div>
    );
  }

  const {
    totalChanges = 0,
    addedCount = 0,
    modifiedCount = 0,
    removedCount = 0,
    unchangedCount = 0,
    globalFields = [],
    itemDiffs = [],
  } = diffInfo;

  const hasNoChanges = totalChanges === 0;

  return (
    <div className="flex flex-col gap-3 font-sans text-xs">
      {/* 差分統計サマリー */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded bg-green-50 border border-green-200">
          <div className="text-[10px] text-green-700 font-bold">追加</div>
          <div className="text-base font-bold text-green-800">{addedCount}</div>
        </div>
        <div className="p-2 rounded bg-amber-50 border border-amber-200">
          <div className="text-[10px] text-amber-700 font-bold">変更</div>
          <div className="text-base font-bold text-amber-800">{modifiedCount}</div>
        </div>
        <div className="p-2 rounded bg-red-50 border border-red-200">
          <div className="text-[10px] text-red-700 font-bold">削除</div>
          <div className="text-base font-bold text-red-800">{removedCount}</div>
        </div>
        <div className="p-2 rounded bg-gray-50 border border-gray-200">
          <div className="text-[10px] text-gray-600 font-bold">変更なし</div>
          <div className="text-base font-bold text-gray-700">{unchangedCount}</div>
        </div>
      </div>

      {/* 差分なし表示 */}
      {hasNoChanges && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded text-center text-blue-800 flex flex-col items-center gap-1">
          <CheckCircle2 className="w-5 h-5 text-blue-600" />
          <span className="font-bold">差分はありません</span>
          <span className="text-[11px] text-blue-600">インポート予定のデータは現状のデータと完全に一致しています。</span>
        </div>
      )}

      {/* グローバルフィールドの差分リスト */}
      {globalFields.length > 0 && (
        <div className="flex flex-col gap-1.5 border border-gray-200 rounded p-2 bg-white">
          <div className="font-bold text-gray-700 text-[11px] flex items-center gap-1 border-b border-gray-100 pb-1">
            <FileCode className="w-3.5 h-3.5 text-indigo-600" />
            <span>設定 / メタデータ差分 ({globalFields.length}件)</span>
          </div>
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
            {globalFields.map((field: ImportDiffField, idx: number) => (
              <div key={`${field.field}-${idx}`} className="flex items-center justify-between p-1.5 bg-gray-50 rounded border border-gray-100 text-[11px]">
                <span className="font-mono font-bold text-gray-800">{field.field}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 line-through max-w-[100px] truncate">{formatValue(field.oldValue)}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-semibold text-gray-900 max-w-[100px] truncate">{formatValue(field.newValue)}</span>
                  {renderStatusBadge(field.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* アイテムの差分リスト */}
      {itemDiffs.length > 0 && (
        <div className="flex flex-col gap-1.5 border border-gray-200 rounded p-2 bg-white">
          <div className="font-bold text-gray-700 text-[11px] flex items-center gap-1 border-b border-gray-100 pb-1">
            <FileCode className="w-3.5 h-3.5 text-indigo-600" />
            <span>アイテム変更詳細 ({itemDiffs.length}件)</span>
          </div>
          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
            {itemDiffs.map((item: ImportItemDiff, idx: number) => (
              <div key={`${item.id}-${idx}`} className="p-2 bg-gray-50 rounded border border-gray-200 flex flex-col gap-1">
                <div className="flex items-center justify-between border-b border-gray-200/60 pb-1">
                  <span className="font-mono font-bold text-gray-800 text-[11px]">ID: {item.id}</span>
                  {renderStatusBadge(item.status)}
                </div>
                {item.fields && item.fields.length > 0 && (
                  <div className="flex flex-col gap-1 pl-2 text-[10px]">
                    {item.fields.map((f: ImportDiffField, fIdx: number) => (
                      <div key={`${f.field}-${fIdx}`} className="flex items-center justify-between">
                        <span className="font-mono text-gray-600">{f.field}:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 max-w-[80px] truncate">{formatValue(f.oldValue)}</span>
                          <span>→</span>
                          <span className="font-medium text-gray-800 max-w-[80px] truncate">{formatValue(f.newValue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 確定 / キャンセルボタン */}
      {(onConfirm || onCancel) && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 mt-1">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded border border-gray-300 cursor-pointer disabled:opacity-50"
            >
              キャンセル
            </button>
          )}
          {onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isProcessing}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? 'インポート中...' : '確定して適用'}
            </button>
          )}
        </div>
      )}
    </div>
  );
});

ImportDiffViewer.displayName = 'ImportDiffViewer';

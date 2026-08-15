import React, { useState } from 'react';
import { Play, CheckCircle2, AlertTriangle, RefreshCw, X, RotateCcw, RotateCw, FileText } from 'lucide-react';
import type { VideoFile } from '../../types';
import type { RenameItem, RenameExecutionResult, UndoRedoStackState, RenameResultItem } from '../../types/rename';
import type { RenameTransaction } from '../../services/rename/RenameTransaction';
import type { IRenameUndoRedoManager } from '../../services/rename/IRenameUndoRedoManager';

interface RenameExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: VideoFile[];
  getFormattedName: (file: VideoFile) => string;
  renameTransaction: RenameTransaction;
  undoRedoManager: IRenameUndoRedoManager;
  onApplyRenameToFiles: (updatedFiles: VideoFile[]) => void;
}

export const RenameExecutionModal: React.FC<RenameExecutionModalProps> = ({
  isOpen,
  onClose,
  files,
  getFormattedName,
  renameTransaction,
  undoRedoManager,
  onApplyRenameToFiles,
}) => {
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<RenameExecutionResult | null>(null);
  const [undoRedoState, setUndoRedoState] = useState<UndoRedoStackState>(undoRedoManager.getState());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // プレビュー対象の抽出
  const itemsToRename: RenameItem[] = files.map((f) => {
    const formatted = getFormattedName(f);
    const proposed = f.newName || (formatted !== f.originalName ? formatted : `renamed_${f.originalName}`);
    return {
      id: f.id,
      originalName: f.originalName,
      proposedName: proposed,
      status: 'pending',
    };
  });

  const activeCount = itemsToRename.filter((i) => i.status === 'pending').length;

  const handleExecute = () => {
    setIsExecuting(true);
    setStatusMessage('リネーム処理を実行中...');

    const { result, record } = renameTransaction.executeTransaction(itemsToRename, {
      rollbackOnFailure: false, // ユーザーに個別エラーを確認させるため
    });

    if (record.canUndo) {
      undoRedoManager.pushTransaction(record);
      setUndoRedoState(undoRedoManager.getState());
    }

    setExecutionResult(result);
    setIsExecuting(false);

    // アプリケーション状態(VideoFile[])の更新
    if (result.results.length > 0) {
      const resultMap = new Map<string, RenameResultItem>(result.results.map((r) => [r.id, r]));
      const nextFiles = files.map((file) => {
        const res = resultMap.get(file.id);
        if (res && res.success) {
          return {
            ...file,
            originalName: res.newName,
            newName: res.newName,
            status: 'completed' as const,
          };
        }
        return file;
      });
      onApplyRenameToFiles(nextFiles);
    }

    setStatusMessage(
      result.success
        ? `完了: ${result.successCount}件のリネームが成功しました`
        : `一部完了: 成功 ${result.successCount}件 / 失敗 ${result.failureCount}件`
    );
  };

  const handleUndo = () => {
    const undoRecord = undoRedoManager.undo();
    if (!undoRecord) return;

    setUndoRedoState(undoRedoManager.getState());

    // 逆リネームの適用
    const resultMap = new Map<string, RenameResultItem>(undoRecord.items.map((r) => [r.id, r]));
    const nextFiles = files.map((file) => {
      const res = resultMap.get(file.id);
      if (res && res.success) {
        return {
          ...file,
          originalName: res.newName,
          status: 'pending' as const,
        };
      }
      return file;
    });
    onApplyRenameToFiles(nextFiles);
    setStatusMessage('Undo (元に戻す) を実行しました');
    setExecutionResult(null);
  };

  const handleRedo = () => {
    const redoRecord = undoRedoManager.redo();
    if (!redoRecord) return;

    setUndoRedoState(undoRedoManager.getState());

    const resultMap = new Map<string, RenameResultItem>(redoRecord.items.map((r) => [r.id, r]));
    const nextFiles = files.map((file) => {
      const res = resultMap.get(file.id);
      if (res && res.success) {
        return {
          ...file,
          originalName: res.newName,
          status: 'completed' as const,
        };
      }
      return file;
    });
    onApplyRenameToFiles(nextFiles);
    setStatusMessage('Redo (やり直し) を実行しました');
    setExecutionResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#141414]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#E4E3E0] border-2 border-[#141414] w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 bg-[#141414] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-indigo-400" />
            <h2 className="font-mono font-bold text-sm tracking-wide uppercase">
              実ファイルリネーム実行エンジン
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white/20 transition-colors text-white cursor-pointer"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Status Message Banner */}
          {statusMessage && (
            <div className="p-3 bg-white border border-[#141414] text-xs font-mono flex items-center justify-between">
              <span className="font-bold text-[#141414]">{statusMessage}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={!undoRedoState.canUndo}
                  className="px-2 py-1 bg-[#141414] text-white text-[11px] font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  title="直前のリネームを取り消す"
                >
                  <RotateCcw className="w-3 h-3" />
                  Undo ({undoRedoState.undoCount})
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={!undoRedoState.canRedo}
                  className="px-2 py-1 bg-[#141414] text-white text-[11px] font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  title="取り消したリネームを再実行"
                >
                  <RotateCw className="w-3 h-3" />
                  Redo ({undoRedoState.redoCount})
                </button>
              </div>
            </div>
          )}

          {/* Overview Stat Cards */}
          <div className="grid grid-cols-3 gap-3 font-mono">
            <div className="bg-white p-3 border border-[#141414]">
              <div className="text-[10px] uppercase text-[#141414]/60">全ファイル数</div>
              <div className="text-xl font-bold text-[#141414]">{files.length}</div>
            </div>
            <div className="bg-white p-3 border border-[#141414]">
              <div className="text-[10px] uppercase text-[#141414]/60">変更予定対象</div>
              <div className="text-xl font-bold text-indigo-700">{activeCount}</div>
            </div>
            <div className="bg-white p-3 border border-[#141414]">
              <div className="text-[10px] uppercase text-[#141414]/60">変更なし/スキップ</div>
              <div className="text-xl font-bold text-gray-500">{files.length - activeCount}</div>
            </div>
          </div>

          {/* Preview / Execution Results List */}
          <div className="border border-[#141414] bg-white">
            <div className="p-2.5 bg-[#F0EFED] border-b border-[#141414] font-mono text-xs font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                対象ファイル一覧と変更プレビュー
              </span>
              <span className="text-[11px] text-[#141414]/60 font-normal">
                {executionResult ? '実行結果表示中' : '実行直前確認'}
              </span>
            </div>

            <div className="divide-y divide-[#141414]/20 max-h-60 overflow-y-auto font-mono text-xs">
              {itemsToRename.map((item) => {
                const isChanged = item.status === 'pending';
                const execRes = executionResult?.results.find((r) => r.id === item.id);

                return (
                  <div key={item.id} className="p-2.5 flex items-center justify-between gap-2 hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <div className="text-gray-500 truncate">{item.originalName}</div>
                      <div className={`font-bold truncate ${isChanged ? 'text-indigo-800' : 'text-gray-400'}`}>
                        → {item.proposedName}
                      </div>
                      {execRes?.error && (
                        <div className="text-[11px] text-red-600 mt-0.5">{execRes.error}</div>
                      )}
                    </div>
                    <div>
                      {execRes ? (
                        execRes.success ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            成功
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold border border-red-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            失敗
                          </span>
                        )
                      ) : isChanged ? (
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-300">
                          変更予定
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] border border-gray-300">
                          変更なし
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#F0EFED] border-t-2 border-[#141414] flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!undoRedoState.canUndo || isExecuting}
              className="px-3 py-1.5 bg-white text-[#141414] border border-[#141414] text-xs font-bold flex items-center gap-1.5 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Undo ({undoRedoState.undoCount})
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!undoRedoState.canRedo || isExecuting}
              className="px-3 py-1.5 bg-white text-[#141414] border border-[#141414] text-xs font-bold flex items-center gap-1.5 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Redo ({undoRedoState.redoCount})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isExecuting}
              className="px-4 py-2 bg-white text-[#141414] border border-[#141414] text-xs font-bold hover:bg-gray-200 transition-colors cursor-pointer"
            >
              閉じる
            </button>
            <button
              type="button"
              onClick={handleExecute}
              disabled={isExecuting || activeCount === 0}
              className="px-4 py-2 bg-indigo-700 text-white border border-indigo-900 text-xs font-bold hover:bg-indigo-800 transition-colors flex items-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  実行中...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  実ファイルリネーム一括実行
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

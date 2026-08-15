import React from 'react';
import { Info, Video, Edit3, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { VideoFile } from '../types';

interface RenamePreviewProps {
  selectedFile: VideoFile | null;
  getFormattedPreviewName: (file: VideoFile) => string;
  onOpenEditModal?: (file: VideoFile) => void;
  onRefreshMetadata?: (file: VideoFile) => void;
}

export const RenamePreview: React.FC<RenamePreviewProps> = React.memo(({
  selectedFile,
  getFormattedPreviewName,
  onOpenEditModal,
  onRefreshMetadata
}) => {
  if (!selectedFile) {
    return (
      <div className="bg-[#F0EFED] border border-[#141414] p-4 text-xs font-mono text-[#141414]/60 italic flex items-center justify-center gap-2">
        <Info className="w-4 h-4 text-[#141414]/40" />
        テーブルからファイルを選択すると、取得した詳細メタデータ（タイトル・出演者・発売日・サムネイル）がここに表示されます。
      </div>
    );
  }

  const previewName = getFormattedPreviewName(selectedFile);

  return (
    <div className="bg-white border border-[#141414] p-4 flex flex-col md:flex-row gap-4 items-start font-mono text-xs">
      {selectedFile.metadata?.coverImageUrl ? (
        <img 
          src={selectedFile.metadata.coverImageUrl as string} 
          alt={selectedFile.originalName}
          className="w-32 h-auto border border-[#141414] object-cover shrink-0" 
        />
      ) : (
        <div className="w-32 h-24 bg-[#141414]/10 border border-[#141414] flex flex-col items-center justify-center text-[#141414]/40 shrink-0">
          <Video className="w-6 h-6 mb-1" />
          <span className="text-[10px]">No Thumbnail</span>
        </div>
      )}

      <div className="flex-1 flex flex-col gap-2 min-w-0 w-full">
        <div className="flex items-center justify-between border-b border-[#141414]/20 pb-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#141414] uppercase text-[10px] tracking-wider">選択ファイル詳細プレビュー</span>
            {selectedFile.metadata?.isUserEdited && (
              <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[9px] px-1 py-0.2 font-bold flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" />
                手動編集済み
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="bg-[#141414] text-white px-1.5 py-0.5 text-[9px] font-bold">
              {selectedFile.extractedId || 'ID未抽出'}
            </span>

            {onOpenEditModal && (
              <button
                onClick={() => onOpenEditModal(selectedFile)}
                className="border border-[#141414] hover:bg-[#F0EFED] text-[#141414] px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1 transition-colors"
                title="メタデータを手動編集"
              >
                <Edit3 className="w-3 h-3 text-amber-600" />
                編集
              </button>
            )}

            {onRefreshMetadata && selectedFile.extractedId && (
              <button
                onClick={() => onRefreshMetadata(selectedFile)}
                className="border border-[#141414] hover:bg-[#F0EFED] text-[#141414] px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1 transition-colors"
                title="キャッシュを破棄してWebから再取得"
              >
                <RefreshCw className="w-3 h-3 text-blue-600" />
                再取得
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-[#141414]/50 block text-[9.5px]">元ファイル名:</span>
            <span className="font-bold break-all">{selectedFile.originalName}</span>
          </div>
          <div>
            <span className="text-[#141414]/50 block text-[9.5px]">変更後プレビュー:</span>
            <span className="font-bold text-green-700 break-all">{previewName || '—'}</span>
          </div>
        </div>

        {selectedFile.metadata && (
          <div className="bg-[#F0EFED] p-2 border border-[#141414]/20 text-[10.5px] flex flex-col gap-1 mt-1">
            <div className="truncate">
              <span className="text-[#141414]/60 font-bold">タイトル: </span>
              <span>{(selectedFile.metadata.title as string) || '—'}</span>
            </div>
            <div className="flex flex-wrap gap-4 text-[10px]">
              <div>
                <span className="text-[#141414]/60 font-bold">出演者: </span>
                <span className="text-purple-800 font-bold">{(selectedFile.metadata.actress as string) || '—'}</span>
              </div>
              <div>
                <span className="text-[#141414]/60 font-bold">発売日: </span>
                <span className="text-amber-800 font-bold">{(selectedFile.metadata.releaseDate as string) || '—'}</span>
              </div>
              <div>
                <span className="text-[#141414]/60 font-bold">シリーズ: </span>
                <span>{(selectedFile.metadata.series as string) || '—'}</span>
              </div>
              {selectedFile.metadata.maker && (
                <div>
                  <span className="text-[#141414]/60 font-bold">メーカー: </span>
                  <span>{(selectedFile.metadata.maker as string) || '—'}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

RenamePreview.displayName = 'RenamePreview';

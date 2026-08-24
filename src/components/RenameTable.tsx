import React, { useState, useRef, useMemo, useCallback } from 'react';
import { 
  Search, RefreshCw, CheckCircle2, AlertCircle, XCircle, Video, Check
} from 'lucide-react';
import type { VideoFile } from '../types';
import { RenameDiffHighlight } from './RenameDiffHighlight';

interface RenameTableProps {
  files: VideoFile[];
  selectedFileId: string | null;
  setSelectedFileId: (id: string | null) => void;
  fileSearchQuery: string;
  setFileSearchQuery: (query: string) => void;
  fileStatusFilter: string;
  setFileStatusFilter: (filter: string) => void;
  fileSortBy: string;
  setFileSortBy: (sort: string) => void;
  fileSortOrder: 'asc' | 'desc';
  setFileSortOrder: (order: 'asc' | 'desc') => void;
  dragActive: boolean;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleSelectAll: (checked: boolean) => void;
  handleSelectFile: (id: string, checked: boolean) => void;
  handleSingleRefreshMetadata: (file: VideoFile) => void;
  handleSingleRenameFile: (file: VideoFile) => void;
  getFormattedPreviewName: (file: VideoFile) => string;
  openTroubleshootingModal: (msg: string) => void;
}

export const RenameTable: React.FC<RenameTableProps> = React.memo(({
  files,
  selectedFileId,
  setSelectedFileId,
  fileSearchQuery,
  setFileSearchQuery,
  fileStatusFilter,
  setFileStatusFilter,
  fileSortBy,
  setFileSortBy,
  fileSortOrder,
  setFileSortOrder,
  dragActive,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleSelectAll,
  handleSelectFile,
  handleSingleRefreshMetadata,
  handleSingleRenameFile,
  getFormattedPreviewName,
  openTroubleshootingModal
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);

  const allCount = files.length;
  const completedCount = useMemo(() => files.filter(f => f.status === 'completed').length, [files]);
  const incompleteCount = useMemo(() => files.filter(f => f.status !== 'completed').length, [files]);

  // Filter & Sort memoized for extreme performance
  const filteredFiles = useMemo(() => {
    return files
      .filter(f => {
        const matchesQuery = fileSearchQuery === '' || 
          f.originalName.toLowerCase().includes(fileSearchQuery.toLowerCase()) ||
          f.extractedId?.toLowerCase().includes(fileSearchQuery.toLowerCase()) ||
          (f.metadata?.title as string)?.toLowerCase().includes(fileSearchQuery.toLowerCase());
        
        const matchesStatus = fileStatusFilter === 'All' ||
          (fileStatusFilter === 'incomplete' ? f.status !== 'completed' : f.status === fileStatusFilter);
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        let valA: string | number = '';
        let valB: string | number = '';
        if (fileSortBy === 'originalName') {
          valA = a.originalName.toLowerCase();
          valB = b.originalName.toLowerCase();
        } else if (fileSortBy === 'extractedId') {
          valA = (a.extractedId || '').toLowerCase();
          valB = (b.extractedId || '').toLowerCase();
        } else if (fileSortBy === 'status') {
          valA = a.status;
          valB = b.status;
        } else if (fileSortBy === 'size') {
          valA = a.sizeBytes || 0;
          valB = b.sizeBytes || 0;
        }
        if (valA < valB) return fileSortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return fileSortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [files, fileSearchQuery, fileStatusFilter, fileSortBy, fileSortOrder]);

  const allSelected = useMemo(() => {
    return filteredFiles.length > 0 && filteredFiles.every(f => f.isSelected);
  }, [filteredFiles]);

  const ROW_HEIGHT = 48; // row height in px
  const OVERSCAN = 5;
  const containerHeight = 350;

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calculate virtual window
  const totalCount = filteredFiles.length;
  const totalHeight = totalCount * ROW_HEIGHT;
  
  // Enable virtual scrolling if > 50 items for super smooth performance with thousands of files
  const isVirtual = totalCount > 50;

  const startIndex = isVirtual ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN) : 0;
  const endIndex = isVirtual ? Math.min(totalCount, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN) : totalCount;

  const visibleFiles = isVirtual ? filteredFiles.slice(startIndex, endIndex) : filteredFiles;
  const offsetY = isVirtual ? startIndex * ROW_HEIGHT : 0;

  return (
    <div className="bg-white border border-[#141414] p-4 rounded-none shadow-none flex flex-col flex-1">
      {/* Search, Filter and Sort Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 bg-[#F0EFED] p-2 border border-[#141414]/20">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[#141414]/60 shrink-0" />
          <input 
            type="text"
            value={fileSearchQuery}
            onChange={(e) => setFileSearchQuery(e.target.value)}
            placeholder="ファイル名・作品ID・タイトルで絞り込み..."
            className="w-full bg-white border border-[#141414] px-2 py-1 text-xs font-mono text-[#141414] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Quick Status Filter Tabs */}
          <div className="flex items-center gap-1" role="group" aria-label="ステータスクイックフィルター">
            <button
              type="button"
              onClick={() => setFileStatusFilter('All')}
              className={`px-2 py-1 border border-[#141414] font-bold text-xs transition-colors cursor-pointer ${
                fileStatusFilter === 'All'
                  ? 'bg-[#141414] text-white'
                  : 'bg-white text-[#141414] hover:bg-[#141414]/10'
              }`}
              title="すべてのファイルを表示"
            >
              すべて ({allCount})
            </button>
            <button
              type="button"
              onClick={() => setFileStatusFilter('completed')}
              className={`px-2 py-1 border border-[#141414] font-bold text-xs transition-colors cursor-pointer ${
                fileStatusFilter === 'completed'
                  ? 'bg-[#141414] text-white'
                  : 'bg-white text-[#141414] hover:bg-[#141414]/10'
              }`}
              title="メタデータ取得完了のファイルのみ表示"
            >
              完了 ({completedCount})
            </button>
            <button
              type="button"
              onClick={() => setFileStatusFilter('incomplete')}
              className={`px-2 py-1 border border-[#141414] font-bold text-xs transition-colors cursor-pointer ${
                fileStatusFilter === 'incomplete'
                  ? 'bg-[#141414] text-white'
                  : 'bg-white text-[#141414] hover:bg-[#141414]/10'
              }`}
              title="未取得または品番のみのファイルを表示"
            >
              未取得/品番のみ ({incompleteCount})
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase opacity-60">詳細:</span>
            <select 
              value={fileStatusFilter}
              onChange={(e) => setFileStatusFilter(e.target.value)}
              className="bg-white border border-[#141414] px-1.5 py-1 text-xs font-mono text-[#141414] focus:outline-none cursor-pointer"
            >
              <option value="All">すべて ({allCount})</option>
              <option value="completed">完了 ({completedCount})</option>
              <option value="incomplete">未取得/品番のみ ({incompleteCount})</option>
              <option value="pending">保留 (pending)</option>
              <option value="searching">取得中 (searching)</option>
              <option value="NotFound">未検出 (NotFound)</option>
              <option value="error">衝突/エラー (error)</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase opacity-60">ソート:</span>
            <select 
              value={fileSortBy}
              onChange={(e) => setFileSortBy(e.target.value)}
              className="bg-white border border-[#141414] px-1.5 py-1 text-xs font-mono text-[#141414] focus:outline-none cursor-pointer"
            >
              <option value="originalName">元のファイル名</option>
              <option value="extractedId">作品ID</option>
              <option value="status">ステータス</option>
              <option value="size">サイズ</option>
            </select>
            <button 
              type="button"
              onClick={() => setFileSortOrder(fileSortOrder === 'asc' ? 'desc' : 'asc')}
              className="bg-white border border-[#141414] px-2 py-1 font-bold text-xs hover:bg-[#141414] hover:text-white transition-colors cursor-pointer"
              title="昇順/降順切り替え"
            >
              {fileSortOrder === 'asc' ? '▲ 昇順' : '▼ 降順'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Container with Virtual Scroll */}
      <div 
        ref={containerRef}
        onScroll={onScroll}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative overflow-x-auto overflow-y-auto border border-[#141414] max-h-[380px] min-h-[220px]"
      >
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#141414] text-white font-mono text-[10px] uppercase sticky top-0 z-10">
            <tr>
              <th className="p-2 border-r border-white/20 w-8 text-center">
                <input 
                  type="checkbox" 
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded-none accent-black cursor-pointer"
                />
              </th>
              <th className="p-2 border-r border-white/20 w-12 text-center">操作</th>
              <th className="p-2 border-r border-white/20 w-[22%] min-w-[150px]">元ファイル名 (Original)</th>
              <th className="p-2 border-r border-white/20 w-[12%] min-w-[85px]">作品ID (ID)</th>
              <th className="p-2 border-r border-white/20 w-[12%] min-w-[85px]">ステータス</th>
              <th className="p-2 border-r border-white/20 w-[20%] min-w-[130px]">URL/ソース</th>
              <th className="p-2 w-[32%] min-w-[220px]">変更後プレビュー (Renamed Preview)</th>
            </tr>
          </thead>
          <tbody className="font-mono divide-y divide-[#141414]/10 bg-white">
            {isVirtual && offsetY > 0 && (
              <tr style={{ height: `${offsetY}px` }}>
                <td colSpan={7} />
              </tr>
            )}
            {visibleFiles.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[#141414]/50 italic">
                  条件に一致するビデオファイルがありません。ファイルをドラッグ＆ドロップするか「追加」してください。
                </td>
              </tr>
            ) : (
              visibleFiles.map((file) => {
                const previewName = getFormattedPreviewName(file);
                const isSelectedRow = selectedFileId === file.id;

                return (
                  <tr 
                    key={file.id} 
                    onClick={() => setSelectedFileId(file.id)}
                    className={`hover:bg-[#141414]/5 transition-colors cursor-pointer ${
                      isSelectedRow ? 'bg-amber-100/60 font-medium' : ''
                    }`}
                    style={{ height: isVirtual ? `${ROW_HEIGHT}px` : undefined }}
                  >
                    <td className="p-2 border-r border-[#141414]/10 text-center" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={!!file.isSelected}
                        onChange={(e) => handleSelectFile(file.id, e.target.checked)}
                        className="rounded-none accent-black cursor-pointer"
                      />
                    </td>
                    <td className="p-2 border-r border-[#141414]/10 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          type="button"
                          onClick={() => handleSingleRefreshMetadata(file)}
                          className="p-1 hover:bg-[#141414] hover:text-white border border-[#141414] transition-colors cursor-pointer text-[10px]"
                          title="個別メタデータ再取得"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleSingleRenameFile(file)}
                          disabled={file.status !== 'completed'}
                          className="p-1 hover:bg-[#141414] hover:text-white border border-[#141414] transition-colors cursor-pointer text-[10px] disabled:opacity-30"
                          title="個別リネーム実行"
                        >
                          <Check className="w-3 h-3 text-green-700" />
                        </button>
                      </div>
                    </td>
                    <td className="p-2 border-r border-[#141414]/10 font-bold text-[#141414] w-[22%] min-w-[150px] truncate" title={file.originalName}>
                      {file.originalName}
                    </td>
                    <td className="p-2 border-r border-[#141414]/10 w-[12%] min-w-[85px]">
                      {file.extractedId ? (
                        <span className="bg-blue-100 text-blue-900 border border-blue-400 px-1 py-0.5 text-[10px] font-bold">
                          {file.extractedId}
                        </span>
                      ) : (
                        <span className="opacity-40 italic text-[10px]">未検出</span>
                      )}
                    </td>
                    <td className="p-2 border-r border-[#141414]/10 w-[12%] min-w-[85px]">
                      {file.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-none text-[10px] font-mono border border-gray-400">
                          PENDING
                        </span>
                      )}
                      {file.status === 'searching' && (
                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-none text-[10px] font-mono border border-blue-500 animate-pulse">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin shrink-0" />
                          FETCHING
                        </span>
                      )}
                      {file.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-850 px-1.5 py-0.5 rounded-none text-[10px] font-mono border border-green-600 font-bold whitespace-nowrap">
                          <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                          READY
                        </span>
                      )}
                      {file.status === 'error' && (
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTroubleshootingModal(file.errorMessage || 'エラーが発生しました');
                          }}
                          className="inline-flex items-center gap-1 bg-red-100 text-red-850 px-1.5 py-0.5 rounded-none text-[10px] font-mono border border-red-600 font-bold whitespace-nowrap hover:bg-red-200 transition-colors cursor-pointer" 
                          title={file.errorMessage || 'クリックでトラブルシューティングを表示'}
                        >
                          <XCircle className="w-2.5 h-2.5 shrink-0" />
                          CONFLICT ❓
                        </button>
                      )}
                      {file.status === 'NotFound' && (
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTroubleshootingModal(file.errorMessage || '作品ID未検出またはメタデータ取得失敗');
                          }}
                          className="inline-flex items-center gap-1 bg-amber-100 text-amber-850 px-1.5 py-0.5 rounded-none text-[10px] font-mono border border-amber-600 font-bold whitespace-nowrap hover:bg-amber-200 transition-colors cursor-pointer" 
                          title={file.errorMessage || 'クリックでトラブルシューティングを表示'}
                        >
                          <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                          NOT FOUND ❓
                        </button>
                      )}
                    </td>
                    <td className="p-2 border-r border-[#141414]/10 font-mono text-[10px] w-[20%] min-w-[130px] truncate whitespace-nowrap" title={file.detailUrl}>
                      {file.detailUrl ? (
                        <a href={file.detailUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline" onClick={(e) => e.stopPropagation()}>
                          {file.detailUrl}
                        </a>
                      ) : (
                        <span className="opacity-30">—</span>
                      )}
                    </td>
                    <td 
                      className="p-2 w-[32%] min-w-[220px]" 
                      title={previewName || file.originalName}
                    >
                      <RenameDiffHighlight 
                        originalName={file.originalName}
                        previewName={previewName}
                        extractedId={file.extractedId}
                        title={file.metadata?.title as string | undefined}
                        actress={file.metadata?.actress as string | undefined}
                        releaseDate={file.metadata?.releaseDate as string | undefined}
                      />
                    </td>
                  </tr>
                );
              })
            )}
            {isVirtual && (totalHeight - offsetY - visibleFiles.length * ROW_HEIGHT) > 0 && (
              <tr style={{ height: `${Math.max(0, totalHeight - offsetY - visibleFiles.length * ROW_HEIGHT)}px` }}>
                <td colSpan={7} />
              </tr>
            )}
          </tbody>
        </table>

        {/* Empty state overlay or Drag-and-drop placeholder */}
        {dragActive && (
          <div className="absolute inset-0 bg-[#E4E3E0]/95 border-2 border-dashed border-[#141414] flex flex-col items-center justify-center gap-3">
            <div className="bg-[#141414] p-4 text-white">
              <Video className="w-10 h-10" />
            </div>
            <h3 className="text-sm font-bold text-[#141414] uppercase tracking-wider">ここにファイルをドロップして追加</h3>
            <p className="text-xs opacity-60">.mp4, .mkv, .avi 形式などのビデオを追加できます</p>
          </div>
        )}
      </div>
    </div>
  );
});

RenameTable.displayName = 'RenameTable';

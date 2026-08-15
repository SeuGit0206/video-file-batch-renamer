import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, AlertCircle } from 'lucide-react';
import type { VideoFile } from '../types';
import type { ScrapedMetadata } from '../types/scraper';

interface MetadataEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: VideoFile | null;
  onSave: (fileId: string, newMetadata: ScrapedMetadata) => void;
}

export const MetadataEditModal: React.FC<MetadataEditModalProps> = ({
  isOpen,
  onClose,
  file,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [actress, setActress] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [series, setSeries] = useState('');
  const [maker, setMaker] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      const meta = file.metadata;
      setTitle(meta?.title || file.title || '');
      setActress(meta?.actress || file.actress || '');
      setReleaseDate(meta?.releaseDate || file.releaseDate || '');
      setSeries(meta?.series || file.series || '');
      setMaker(meta?.maker || '');
      setErrorMsg(null);
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedTitle = title.trim();
    if (!trimmedTitle && !file.extractedId) {
      setErrorMsg('タイトルまたは作品IDが必要です');
      return;
    }

    const productId = file.extractedId || file.metadata?.productId || 'UNKNOWN';

    const updatedMetadata: ScrapedMetadata = {
      ...file.metadata,
      productId,
      title: trimmedTitle,
      actress: actress.trim(),
      releaseDate: releaseDate.trim(),
      series: series.trim(),
      maker: maker.trim(),
      isUserEdited: true,
      debug: file.metadata?.debug || {
        finalUrl: '',
        pageTitle: '',
        htmlLength: 0,
        htmlPreview: '',
        bodyPreview: '',
      },
    };

    onSave(file.id, updatedMetadata);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] w-full max-w-lg font-mono text-xs flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#141414] text-white p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-amber-400" />
            <span className="font-bold tracking-wider uppercase text-sm">メタデータ手動編集</span>
          </div>
          <button 
            onClick={onClose}
            className="hover:bg-white/20 p-1 rounded-xs transition-colors"
            title="閉じる"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto flex-1">
          <div className="bg-[#F0EFED] p-2 border border-[#141414]/20 text-[11px] mb-2">
            <span className="text-[#141414]/60 block font-bold">対象ファイル:</span>
            <span className="font-bold break-all text-[#141414]">{file.originalName}</span>
            <span className="ml-2 text-[10px] bg-[#141414] text-white px-1.5 py-0.5 rounded-xs">
              ID: {file.extractedId || '未抽出'}
            </span>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-500 text-red-700 p-2 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-[#141414]/70 font-bold mb-1">タイトル (title):</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-[#141414] p-2 focus:outline-none focus:ring-1 focus:ring-[#141414] bg-white text-xs"
              placeholder="例: 豪華サンプル作品"
            />
          </div>

          <div>
            <label className="block text-[#141414]/70 font-bold mb-1">出演者 (actress):</label>
            <input
              type="text"
              value={actress}
              onChange={e => setActress(e.target.value)}
              className="w-full border border-[#141414] p-2 focus:outline-none focus:ring-1 focus:ring-[#141414] bg-white text-xs"
              placeholder="例: 女優A, 女優B"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#141414]/70 font-bold mb-1">発売日 (releaseDate):</label>
              <input
                type="text"
                value={releaseDate}
                onChange={e => setReleaseDate(e.target.value)}
                className="w-full border border-[#141414] p-2 focus:outline-none focus:ring-1 focus:ring-[#141414] bg-white text-xs"
                placeholder="例: 2026-08-10"
              />
            </div>
            <div>
              <label className="block text-[#141414]/70 font-bold mb-1">メーカー (maker):</label>
              <input
                type="text"
                value={maker}
                onChange={e => setMaker(e.target.value)}
                className="w-full border border-[#141414] p-2 focus:outline-none focus:ring-1 focus:ring-[#141414] bg-white text-xs"
                placeholder="例: S1 NO.1 STYLE"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#141414]/70 font-bold mb-1">シリーズ (series):</label>
            <input
              type="text"
              value={series}
              onChange={e => setSeries(e.target.value)}
              className="w-full border border-[#141414] p-2 focus:outline-none focus:ring-1 focus:ring-[#141414] bg-white text-xs"
              placeholder="例: シリーズX"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-[#141414]/20 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="border border-[#141414] px-3 py-1.5 hover:bg-[#F0EFED] font-bold text-xs"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="bg-[#141414] text-white px-4 py-1.5 font-bold text-xs flex items-center gap-1 hover:bg-[#141414]/90"
            >
              <Save className="w-3.5 h-3.5" />
              保存して更新
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

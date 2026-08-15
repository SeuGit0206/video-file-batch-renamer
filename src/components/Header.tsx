import React from 'react';
import { Terminal, Code2, Layers, Upload, Sliders, Info } from 'lucide-react';
import { ExportButton } from './export/ExportButton';

interface HeaderProps {
  activeTab: 'simulator' | 'code' | 'architecture';
  setActiveTab: (tab: 'simulator' | 'code' | 'architecture') => void;
  onOpenExportModal?: () => void;
  onOpenImportModal?: () => void;
  onOpenRuleModal?: () => void;
  onOpenInfoModal?: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({ activeTab, setActiveTab, onOpenExportModal, onOpenImportModal, onOpenRuleModal, onOpenInfoModal }) => {
  return (
    <header className="border-b-2 border-[#141414] bg-[#E4E3E0] px-4 py-4 sm:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="bg-[#141414] text-white text-[10px] font-mono px-2 py-0.5 font-bold uppercase tracking-widest">
            Production v1.12.0
          </span>
          <span className="text-xs font-mono text-[#141414]/60">React + TypeScript / Clean Architecture</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#141414] mt-1 flex items-center gap-2">
          MissAV Video Batch Renamer & Scraper
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1 bg-[#F0EFED] p-1 border border-[#141414]">
          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold transition-colors cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-[#141414] text-white'
                : 'text-[#141414] hover:bg-[#141414]/10'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            WPF シミュレータ
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold transition-colors cursor-pointer ${
              activeTab === 'code'
                ? 'bg-[#141414] text-white'
                : 'text-[#141414] hover:bg-[#141414]/10'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            C# 実装コード規約
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold transition-colors cursor-pointer ${
              activeTab === 'architecture'
                ? 'bg-[#141414] text-white'
                : 'text-[#141414] hover:bg-[#141414]/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            アーキテクチャ・設計図
          </button>
        </div>

        {onOpenRuleModal && (
          <button
            type="button"
            onClick={onOpenRuleModal}
            className="h-[34px] px-3 bg-[#141414] text-white hover:bg-[#141414]/80 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors border border-[#141414] cursor-pointer"
            title="ルール設定 (Ctrl+R)"
          >
            <Sliders className="w-3.5 h-3.5" />
            ルール
          </button>
        )}

        {onOpenImportModal && (
          <button
            type="button"
            onClick={onOpenImportModal}
            className="h-[34px] px-3 bg-[#141414] text-white hover:bg-[#141414]/80 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors border border-[#141414] cursor-pointer"
            title="インポート (Ctrl+I)"
          >
            <Upload className="w-3.5 h-3.5" />
            インポート
          </button>
        )}

        {onOpenExportModal && (
          <ExportButton
            onClick={onOpenExportModal}
            label="エクスポート"
            className="h-[34px] font-mono font-bold"
          />
        )}

        {onOpenInfoModal && (
          <button
            type="button"
            onClick={onOpenInfoModal}
            className="h-[34px] px-3 bg-[#141414] text-amber-400 hover:bg-[#141414]/80 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors border border-[#141414] cursor-pointer"
            title="アプリ情報・ログ・バックアップ"
          >
            <Info className="w-3.5 h-3.5" />
            アプリ情報
          </button>
        )}
      </div>
    </header>
  );
});

Header.displayName = 'Header';

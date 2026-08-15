import React from 'react';
import { HelpCircle, FileCode } from 'lucide-react';

interface TroubleshootingError {
  title: string;
  message: string;
  code: string;
  solution: string[];
  link: string;
}

interface TroubleshootingModalProps {
  activeTroubleshootingError: TroubleshootingError | null;
  setActiveTroubleshootingError: (val: TroubleshootingError | null) => void;
}

export const TroubleshootingModal: React.FC<TroubleshootingModalProps> = React.memo(({
  activeTroubleshootingError,
  setActiveTroubleshootingError
}) => {
  if (!activeTroubleshootingError) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-[#141414] max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 font-sans">
        <div className="flex items-center justify-between border-b border-[#141414]/20 pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-sm text-[#141414] uppercase tracking-wide">
              {activeTroubleshootingError.title}
            </h3>
          </div>
          <button 
            type="button"
            onClick={() => setActiveTroubleshootingError(null)}
            className="text-[#141414] hover:bg-[#141414] hover:text-white p-1 border border-[#141414] text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="bg-red-50 border border-red-300 p-2.5 font-mono text-xs text-red-900 break-all">
          <span className="font-bold">エラー内容: </span>
          {activeTroubleshootingError.message}
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="font-bold text-xs text-[#141414] uppercase">💡 推奨解決手順 (Step-by-Step):</h4>
          <ol className="list-decimal list-inside text-xs text-[#141414]/90 flex flex-col gap-1.5 bg-[#F0EFED] p-3 border border-[#141414]/20 font-sans leading-relaxed">
            {activeTroubleshootingError.solution.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#141414]/10">
          <a 
            href={`https://github.com/user/video-renamer-tool/blob/main/${activeTroubleshootingError.link}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-blue-700 hover:underline font-mono font-bold flex items-center gap-1"
          >
            <FileCode className="w-4 h-4 text-blue-700" />
            docs/TROUBLESHOOTING.md で詳細を読む ↗
          </a>
          <button 
            type="button"
            onClick={() => setActiveTroubleshootingError(null)}
            className="bg-[#141414] text-white hover:bg-white hover:text-[#141414] border border-[#141414] px-4 py-1.5 text-xs font-bold uppercase transition-colors cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
});

TroubleshootingModal.displayName = 'TroubleshootingModal';

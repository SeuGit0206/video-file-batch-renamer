import React from 'react';

interface RenameDiffHighlightProps {
  originalName: string;
  previewName: string;
  extractedId?: string;
  title?: string;
  actress?: string;
  releaseDate?: string;
  series?: string;
}

export const RenameDiffHighlight: React.FC<RenameDiffHighlightProps> = React.memo(({
  originalName,
  previewName,
  extractedId,
  actress,
  releaseDate
}) => {
  if (!previewName) return <span className="opacity-40 font-normal">—</span>;

  return (
    <div className="font-mono text-[11px] leading-tight">
      <div className="text-green-800 font-bold flex flex-wrap items-center gap-1">
        {extractedId && previewName.includes(extractedId) && (
          <span className="bg-blue-100 text-blue-900 px-1 py-0.2 rounded-none border border-blue-400 font-bold text-[10px]" title="作品ID (ID)">
            {extractedId}
          </span>
        )}
        {actress && previewName.includes(actress) && (
          <span className="bg-purple-100 text-purple-900 px-1 py-0.2 rounded-none border border-purple-400 font-bold text-[10px]" title="出演者 (Actress)">
            {actress}
          </span>
        )}
        {releaseDate && previewName.includes(releaseDate) && (
          <span className="bg-amber-100 text-amber-900 px-1 py-0.2 rounded-none border border-amber-400 font-bold text-[10px]" title="発売日 (Date)">
            {releaseDate}
          </span>
        )}
        <span className="text-green-700/90 break-all">{previewName}</span>
      </div>
      {originalName !== previewName && (
        <div className="text-[9.5px] text-[#141414]/50 line-through mt-0.5 truncate" title={`変更前: ${originalName}`}>
          {originalName}
        </div>
      )}
    </div>
  );
});

RenameDiffHighlight.displayName = 'RenameDiffHighlight';

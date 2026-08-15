import React from 'react';

interface RenameTemplatePresetProps {
  setRenameTemplate: (template: string) => void;
}

export const RenameTemplatePreset: React.FC<RenameTemplatePresetProps> = React.memo(({ setRenameTemplate }) => {
  return (
    <div className="mt-2.5 pt-2 border-t border-[#141414]/10">
      <span className="block text-[10px] text-[#141414]/60 font-bold uppercase mb-1">プリセット選択:</span>
      <div className="flex flex-wrap gap-1.5">
        <button 
          type="button" 
          onClick={() => setRenameTemplate('{actress}/{id}_{title}')}
          className="bg-white border border-[#141414] text-[#141414] px-2 py-1 text-[10px] font-mono hover:bg-[#141414] hover:text-white transition-colors cursor-pointer"
          title="出演者フォルダ別 ({actress}/{id}_{title})"
        >
          出演者別
        </button>
        <button 
          type="button" 
          onClick={() => setRenameTemplate('{maker}/{date}_{id}')}
          className="bg-white border border-[#141414] text-[#141414] px-2 py-1 text-[10px] font-mono hover:bg-[#141414] hover:text-white transition-colors cursor-pointer"
          title="メーカー・日付別 ({maker}/{date}_{id})"
        >
          メーカー・日付別
        </button>
        <button 
          type="button" 
          onClick={() => setRenameTemplate('{id}_{title}')}
          className="bg-white border border-[#141414] text-[#141414] px-2 py-1 text-[10px] font-mono hover:bg-[#141414] hover:text-white transition-colors cursor-pointer"
          title="標準形式 ({id}_{title})"
        >
          標準形式
        </button>
      </div>
    </div>
  );
});

RenameTemplatePreset.displayName = 'RenameTemplatePreset';

import React from 'react';
import { Download } from 'lucide-react';

export interface ExportButtonProps {
  onClick?: () => void;
  className?: string;
  label?: string;
  disabled?: boolean;
}

/**
 * エクスポートモーダル起動用ボタンコンポーネント
 */
export const ExportButton: React.FC<ExportButtonProps> = React.memo(({
  onClick,
  className = '',
  label = 'データエクスポート',
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#141414] text-[#141414] font-medium text-xs hover:bg-[#141414] hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Download className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
});

ExportButton.displayName = 'ExportButton';

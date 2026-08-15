import React, { useState } from 'react';
import { AlertCircle, RefreshCw, X, ChevronDown, ChevronUp, Info, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { AppErrorDetails } from '../errors/AppErrorCodes';

interface ErrorNotificationBannerProps {
  errorDetails: AppErrorDetails | null;
  onClose: () => void;
  onRetry?: () => void;
}

export const ErrorNotificationBanner: React.FC<ErrorNotificationBannerProps> = ({
  errorDetails,
  onClose,
  onRetry,
}) => {
  const [showTechnical, setShowTechnical] = useState(false);

  if (!errorDetails) return null;

  const getCategoryBadge = () => {
    switch (errorDetails.category) {
      case 'retryable':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <RefreshCw className="w-3 h-3 animate-spin-slow" />
            再試行可能 (Retryable)
          </span>
        );
      case 'recoverable':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <Info className="w-3 h-3" />
            回復可能 (Recoverable)
          </span>
        );
      case 'fatal':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-red-100 text-red-800 border border-red-300">
            <ShieldAlert className="w-3 h-3" />
            重大エラー (Fatal)
          </span>
        );
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="my-3 p-4 bg-red-50/90 border-2 border-red-800 rounded-md shadow-md text-[#141414] transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-red-900 text-white rounded">
                [{errorDetails.code}]
              </span>
              {getCategoryBadge()}
            </div>
            <h4 className="font-bold text-sm text-red-950">{errorDetails.userMessage}</h4>
            {errorDetails.suggestion && (
              <p className="text-xs text-red-900 flex items-center gap-1 mt-1 font-mono">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>対処法: {errorDetails.suggestion}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {errorDetails.retryable && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1 bg-red-800 hover:bg-red-900 text-white font-mono text-xs font-bold rounded flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              再試行
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="エラー表示を閉じる"
            className="p-1 text-red-700 hover:bg-red-100 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorDetails.technicalDetails && (
        <div className="mt-3 pt-2 border-t border-red-200">
          <button
            type="button"
            onClick={() => setShowTechnical((prev) => !prev)}
            className="text-xs font-mono text-red-800 hover:underline flex items-center gap-1 cursor-pointer"
          >
            {showTechnical ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            詳細技術情報 ({showTechnical ? '非表示' : '表示'})
          </button>
          {showTechnical && (
            <pre className="mt-2 p-2 bg-red-100 text-red-950 text-[11px] font-mono rounded overflow-x-auto border border-red-200">
              {errorDetails.technicalDetails}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

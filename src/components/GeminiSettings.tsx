import React from 'react';
import { Cpu, RefreshCw, Check, XCircle, HelpCircle } from 'lucide-react';

interface GeminiSettingsProps {
  geminiApiKeyInput: string;
  setGeminiApiKeyInput: (val: string) => void;
  handleTestGeminiApi: () => void;
  geminiTestStatus: {
    loading: boolean;
    success?: boolean;
    message?: string;
    error?: string;
    troubleshootingUrl?: string;
  } | null;
  openTroubleshootingModal: (msg: string) => void;
}

export const GeminiSettings: React.FC<GeminiSettingsProps> = React.memo(({
  geminiApiKeyInput,
  setGeminiApiKeyInput,
  handleTestGeminiApi,
  geminiTestStatus,
  openTroubleshootingModal
}) => {
  return (
    <div className="bg-white border border-[#141414] p-4 rounded-none shadow-none flex flex-col gap-3">
      <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#141414]/60 flex items-center gap-1.5">
        <Cpu className="w-4 h-4 text-[#141414]" />
        Gemini API 接続テスト (Phase 53 Step 2)
      </h3>
      <div className="flex flex-col gap-2">
        <label className="block text-[11px] text-[#141414]/80 font-bold uppercase tracking-wider">
          API キー設定 (オプション)
        </label>
        <div className="flex gap-2">
          <input 
            type="password"
            value={geminiApiKeyInput}
            onChange={(e) => setGeminiApiKeyInput(e.target.value)}
            placeholder="環境変数のキーを利用 (空欄で可)"
            className="flex-1 bg-white border border-[#141414] px-3 py-1.5 rounded-none text-xs font-mono text-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414]"
          />
          <button 
            type="button"
            onClick={handleTestGeminiApi}
            disabled={geminiTestStatus?.loading}
            className="bg-[#141414] hover:bg-white hover:text-[#141414] text-white border border-[#141414] px-3 py-1.5 rounded-none text-xs font-bold uppercase transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {geminiTestStatus?.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'テスト接続'}
          </button>
        </div>
        {geminiTestStatus && !geminiTestStatus.loading && (
          <div className={`p-2.5 border text-xs font-mono flex flex-col gap-1 ${
            geminiTestStatus.success ? 'bg-green-50 border-green-500 text-green-900' : 'bg-red-50 border-red-500 text-red-900'
          }`}>
            <div className="flex items-center gap-1.5 font-bold">
              {geminiTestStatus.success ? <Check className="w-4 h-4 text-green-700" /> : <XCircle className="w-4 h-4 text-red-700" />}
              <span>{geminiTestStatus.success ? '接続成功' : '接続失敗'}</span>
            </div>
            <p className="text-[11px]">{geminiTestStatus.message || geminiTestStatus.error}</p>
            {geminiTestStatus.error && (
              <button 
                type="button"
                onClick={() => openTroubleshootingModal(geminiTestStatus.error || '')}
                className="text-[10px] text-blue-700 underline font-bold text-left cursor-pointer hover:text-blue-900 mt-1 flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3" />
                ❓ エラーの解決手順を見る
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

GeminiSettings.displayName = 'GeminiSettings';

import React from 'react';
import { Settings } from 'lucide-react';
import { RenameTemplatePreset } from './RenameTemplatePreset';

interface SettingsPanelProps {
  renameTemplate: string;
  setRenameTemplate: React.Dispatch<React.SetStateAction<string>>;
  regexPattern: string;
  setRegexPattern: React.Dispatch<React.SetStateAction<string>>;
  skipDuplicates: boolean;
  setSkipDuplicates: React.Dispatch<React.SetStateAction<boolean>>;
  useCache: boolean;
  setUseCache: React.Dispatch<React.SetStateAction<boolean>>;
  showBrowser: boolean;
  setShowBrowser: React.Dispatch<React.SetStateAction<boolean>>;
  cookiePath: string;
  setCookiePath: React.Dispatch<React.SetStateAction<string>>;
  cacheSavePath: string;
  setCacheSavePath: React.Dispatch<React.SetStateAction<string>>;
  logRetentionDays: number;
  setLogRetentionDays: React.Dispatch<React.SetStateAction<number>>;
  maxConcurrency: number;
  setMaxConcurrency: React.Dispatch<React.SetStateAction<number>>;
  accessDelayMs: number;
  setAccessDelayMs: React.Dispatch<React.SetStateAction<number>>;
  addLog: (level: 'Debug' | 'Info' | 'Warning' | 'Error', source: string, message: string) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = React.memo(({
  renameTemplate,
  setRenameTemplate,
  regexPattern,
  setRegexPattern,
  skipDuplicates,
  setSkipDuplicates,
  useCache,
  setUseCache,
  showBrowser,
  setShowBrowser,
  cookiePath,
  setCookiePath,
  cacheSavePath,
  setCacheSavePath,
  logRetentionDays,
  setLogRetentionDays,
  maxConcurrency,
  setMaxConcurrency,
  accessDelayMs,
  setAccessDelayMs,
  addLog
}) => {
  return (
    <div className="bg-white border border-[#141414] p-4 rounded-none shadow-none flex flex-col gap-4">
      <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#141414]/60 flex items-center gap-1.5">
        <Settings className="w-4 h-4 text-[#141414]" />
        WPF MVVM バインディング設定
      </h3>

      {/* Template Field */}
      <div>
        <label className="block text-[11px] text-[#141414]/80 mb-1.5 font-bold uppercase tracking-wider">
          リネーム規則テンプレート (RenameTemplate)
        </label>
        <input 
          type="text"
          value={renameTemplate}
          onChange={(e) => setRenameTemplate(e.target.value)}
          className="w-full bg-white border border-[#141414] px-3 py-1.5 rounded-none text-xs font-mono text-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414]"
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {['{id}', '{title}', '{actress}', '{date}', '{series}'].map(tag => (
            <button 
              key={tag}
              type="button"
              onClick={() => setRenameTemplate(prev => prev + tag)}
              className="bg-[#F0EFED] hover:bg-[#141414] hover:text-white border border-[#141414]/20 text-[#141414] px-2 py-0.5 rounded-none text-[10px] font-mono transition-colors cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>

        <RenameTemplatePreset setRenameTemplate={setRenameTemplate} />
      </div>

      {/* Regex Field */}
      <div>
        <label className="block text-[11px] text-[#141414]/80 mb-1.5 font-bold uppercase tracking-wider">
          作品ID抽出正規表現 (RegexPattern)
        </label>
        <input 
          type="text"
          value={regexPattern}
          onChange={(e) => setRegexPattern(e.target.value)}
          className="w-full bg-white border border-[#141414] px-3 py-1.5 rounded-none text-xs font-mono text-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414]"
        />
        <div className="flex gap-2 mt-1.5">
          <button 
            type="button" 
            onClick={() => setRegexPattern('(?i)\\b([a-z]{2,6})-([0-9]{3,5})\\b')}
            className="bg-[#F0EFED] text-[#141414] border border-[#141414]/20 text-[10px] px-2 py-1 rounded-none hover:bg-[#141414] hover:text-white transition-colors cursor-pointer"
          >
            標準 (ABC-123)
          </button>
          <button 
            type="button" 
            onClick={() => setRegexPattern('(?i)\\b([a-z]{2,6})([0-9]{3,5})\\b')}
            className="bg-[#F0EFED] text-[#141414] border border-[#141414]/20 text-[10px] px-2 py-1 rounded-none hover:bg-[#141414] hover:text-white transition-colors cursor-pointer"
          >
            ハイフン無 (ABC123)
          </button>
        </div>
      </div>

      <div className="border-t border-[#141414]/10 pt-3 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-[#141414] font-medium">
            <input 
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              className="rounded-none border-[#141414] bg-white text-[#141414] focus:ring-[#141414] w-3.5 h-3.5 cursor-pointer"
            />
            <span>重複を連番回避</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-[#141414] font-medium">
            <input 
              type="checkbox"
              checked={useCache}
              onChange={(e) => setUseCache(e.target.checked)}
              className="rounded-none border-[#141414] bg-white text-[#141414] focus:ring-[#141414] w-3.5 h-3.5 cursor-pointer"
            />
            <span>LiteDB キャッシュ</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-[#141414] font-medium col-span-2">
            <input 
              type="checkbox"
              checked={showBrowser}
              onChange={(e) => {
                setShowBrowser(e.target.checked);
                addLog('Info', 'PlaywrightBrowserService', `有頭ブラウザ表示設定を ${e.target.checked ? '有効 (Headless=False)' : '無効 (Headless=True)'} に切り替えました。`);
              }}
              className="rounded-none border-[#141414] bg-white text-[#141414] focus:ring-[#141414] w-3.5 h-3.5 cursor-pointer"
            />
            <span>有頭ブラウザ表示 (Headless=False)</span>
          </label>
        </div>

        <div className="border-t border-[#141414]/10 pt-2 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-[#141414]/60 uppercase font-bold mb-1">
                Cookie保存場所
              </label>
              <input 
                type="text"
                value={cookiePath}
                onChange={(e) => setCookiePath(e.target.value)}
                className="w-full bg-white border border-[#141414] px-2 py-1 rounded-none text-[10.5px] font-mono text-[#141414] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#141414]/60 uppercase font-bold mb-1">
                キャッシュ保存先
              </label>
              <input 
                type="text"
                value={cacheSavePath}
                onChange={(e) => setCacheSavePath(e.target.value)}
                className="w-full bg-white border border-[#141414] px-2 py-1 rounded-none text-[10.5px] font-mono text-[#141414] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <label className="block text-[9px] text-[#141414]/60 uppercase font-bold mb-1" title="ログファイルの保存日数">
                ログ保存(日)
              </label>
              <input 
                type="number"
                value={logRetentionDays}
                onChange={(e) => setLogRetentionDays(Number(e.target.value))}
                className="w-full bg-white border border-[#141414] px-2 py-1 rounded-none text-[10.5px] font-mono text-[#141414] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-[#141414]/60 uppercase font-bold mb-1" title="同時リクエスト接続スレッド数制限">
                同時接続数
              </label>
              <input 
                type="number"
                value={maxConcurrency}
                onChange={(e) => setMaxConcurrency(Number(e.target.value))}
                className="w-full bg-white border border-[#141414] px-2 py-1 rounded-none text-[10.5px] font-mono text-[#141414] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-[#141414]/60 uppercase font-bold mb-1" title="リクエストごとのウェイトクールダウン遅延(ms)">
                待機時間(ms)
              </label>
              <input 
                type="number"
                value={accessDelayMs}
                onChange={(e) => setAccessDelayMs(Number(e.target.value))}
                className="w-full bg-white border border-[#141414] px-2 py-1 rounded-none text-[10.5px] font-mono text-[#141414] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

SettingsPanel.displayName = 'SettingsPanel';

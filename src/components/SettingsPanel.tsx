import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Trash2, RefreshCw, Database } from 'lucide-react';
import { RenameTemplatePreset } from './RenameTemplatePreset';
import type { ICacheStats } from '../cache/ICacheAdapter';

function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `約 ${unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

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
  onClearClientCache?: () => void;
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
  addLog,
  onClearClientCache
}) => {
  const [cacheStats, setCacheStats] = useState<ICacheStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [isClearingCache, setIsClearingCache] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [cacheMessage, setCacheMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCacheStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const res = await fetch('/api/cache/stats');
      if (res.ok) {
        const data = await res.json();
        setCacheStats(data);
      }
    } catch {
      // ignore fetch errors
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchCacheStats();
  }, [fetchCacheStats]);

  const handleClearCache = async () => {
    setShowConfirmModal(false);
    setIsClearingCache(true);
    setCacheMessage(null);
    try {
      // 1. Clear server-side cache
      const res = await fetch('/api/cache', { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      // 2. Clear client-side cache
      if (onClearClientCache) {
        onClearClientCache();
      }

      addLog('Info', 'CacheManager', 'クライアントおよびサーバーのメタデータキャッシュを完全にクリアしました。');
      setCacheMessage({ type: 'success', text: 'キャッシュを全消去しました。' });
      await fetchCacheStats();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addLog('Error', 'CacheManager', `キャッシュクリア失敗: ${errMsg}`);
      setCacheMessage({ type: 'error', text: `キャッシュ消去に失敗しました: ${errMsg}` });
    } finally {
      setIsClearingCache(false);
    }
  };

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

        {/* Cache Management Section (B-3) */}
        <div className="border-t border-[#141414]/10 pt-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-[#141414]/80 uppercase font-bold flex items-center gap-1">
              <Database className="w-3 h-3 text-[#141414]" />
              キャッシュ管理・統計
            </label>
            <button
              type="button"
              onClick={fetchCacheStats}
              disabled={isLoadingStats}
              className="text-[9px] text-[#141414]/60 hover:text-[#141414] flex items-center gap-1 cursor-pointer font-mono"
              title="キャッシュ統計を再取得"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isLoadingStats ? 'animate-spin' : ''}`} />
              更新
            </button>
          </div>

          <div className="bg-[#F0EFED] border border-[#141414]/20 p-2 flex flex-col gap-1.5 text-[10.5px] font-mono">
            <div className="flex justify-between items-center">
              <span className="text-[#141414]/70">保存件数:</span>
              <span className="font-bold text-[#141414]">
                {cacheStats ? `${cacheStats.count} / ${cacheStats.maxEntries} 件` : '取得中...'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#141414]/70">キャッシュファイル容量:</span>
              <span className="font-bold text-[#141414]">
                {cacheStats ? formatBytes(cacheStats.sizeBytes) : '取得中...'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#141414]/70">有効期限 (TTL):</span>
              <span className="text-[#141414]">24時間 (LRU自動整理)</span>
            </div>

            <div className="pt-1.5 border-t border-[#141414]/10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={isClearingCache}
                className="bg-white hover:bg-red-600 hover:text-white border border-[#141414] text-red-600 px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                {isClearingCache ? '消去中...' : 'キャッシュ全消去'}
              </button>
              {cacheMessage && (
                <span className={`text-[9.5px] ${cacheMessage.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                  {cacheMessage.text}
                </span>
              )}
            </div>
          </div>
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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-[#141414]/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#141414] max-w-sm w-full p-4 flex flex-col gap-3 shadow-lg">
            <h4 className="text-xs font-bold text-[#141414] uppercase tracking-wider flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-red-600" />
              キャッシュ全消去の確認
            </h4>
            <p className="text-[11px] text-[#141414]/80 leading-relaxed">
              保存されているクライアントおよびサーバーのメタデータキャッシュをすべて消去します。この操作は取り消せません。続行しますか？
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#141414]/10">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-3 py-1 bg-[#F0EFED] hover:bg-[#141414] hover:text-white border border-[#141414]/20 text-[11px] font-bold cursor-pointer transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleClearCache}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold cursor-pointer transition-colors"
              >
                全消去する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

SettingsPanel.displayName = 'SettingsPanel';


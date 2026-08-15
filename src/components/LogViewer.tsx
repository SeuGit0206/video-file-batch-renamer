import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Terminal, Search, Filter, Calendar, Copy, Check, Save, Trash2 } from 'lucide-react';
import type { LogEntry } from '../types';

interface LogViewerProps {
  logs: LogEntry[];
  handleCopyLogs: () => void;
  handleSaveLogs: () => void;
  handleClearLogs: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = React.memo(({
  logs,
  handleCopyLogs,
  handleSaveLogs,
  handleClearLogs
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'All' | 'Debug' | 'Info' | 'Warning' | 'Error'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // ログレベル フィルター
      if (levelFilter !== 'All' && log.level !== levelFilter) {
        return false;
      }

      // 検索キーワード フィルター
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchMessage = log.message.toLowerCase().includes(query);
        const matchSource = log.source.toLowerCase().includes(query);
        const matchTime = log.timestamp.toLowerCase().includes(query);
        if (!matchMessage && !matchSource && !matchTime) {
          return false;
        }
      }

      // 日付 フィルター
      if (startDate) {
        const logDateStr = log.timestamp.slice(0, 10);
        if (logDateStr < startDate) return false;
      }
      if (endDate) {
        const logDateStr = log.timestamp.slice(0, 10);
        if (logDateStr > endDate) return false;
      }

      return true;
    });
  }, [logs, levelFilter, searchQuery, startDate, endDate]);

  const onCopy = () => {
    handleCopyLogs();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#141414] text-[#E4E3E0] border border-[#141414] p-4 rounded-none shadow-none flex flex-col flex-1 min-h-[300px]">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 border-b border-white/20 pb-2.5">
        <h3 className="text-[10px] uppercase tracking-widest font-bold text-white/60 flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-white" />
          Console Log (Serilog / ILogger) ({filteredLogs.length} / {logs.length} 件)
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <button 
            type="button"
            onClick={onCopy}
            className="bg-white/10 hover:bg-white hover:text-[#141414] text-white px-2 py-1 border border-white/20 text-[10px] font-bold flex items-center gap-1 transition-colors rounded-none cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'コピー完了' : '📋 ログをコピー'}
          </button>
          <button 
            type="button"
            onClick={handleSaveLogs}
            className="bg-white/10 hover:bg-white hover:text-[#141414] text-white px-2 py-1 border border-white/20 text-[10px] font-bold flex items-center gap-1 transition-colors rounded-none cursor-pointer"
          >
            <Save className="w-3 h-3" />
            💾 ログ保存
          </button>
          <button 
            type="button"
            onClick={handleClearLogs}
            className="bg-red-950/40 hover:bg-red-700 text-white px-2 py-1 border border-red-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors rounded-none cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            🗑 ログクリア
          </button>
        </div>
      </div>

      {/* 検索・フィルターツールバー */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-3 bg-white/5 p-2 border border-white/10">
        {/* キーワード検索 */}
        <div className="sm:col-span-5 flex items-center gap-1.5 bg-[#1a1a1a] border border-white/20 px-2 py-1">
          <Search className="w-3.5 h-3.5 text-white/50 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ログ内テキスト検索..."
            className="bg-transparent text-white text-[11px] outline-none w-full placeholder:text-white/30"
          />
        </div>

        {/* ログレベル選択 */}
        <div className="sm:col-span-3 flex items-center gap-1.5 bg-[#1a1a1a] border border-white/20 px-2 py-1">
          <Filter className="w-3.5 h-3.5 text-white/50 shrink-0" />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as 'All' | 'Debug' | 'Info' | 'Warning' | 'Error')}
            className="bg-transparent text-white text-[11px] outline-none w-full cursor-pointer"
          >
            <option value="All" className="bg-[#141414] text-white">全レベル (All)</option>
            <option value="Debug" className="bg-[#141414] text-blue-300">Debug</option>
            <option value="Info" className="bg-[#141414] text-gray-200">Info</option>
            <option value="Warning" className="bg-[#141414] text-amber-300">Warning</option>
            <option value="Error" className="bg-[#141414] text-red-300">Error</option>
          </select>
        </div>

        {/* 日付フィルター */}
        <div className="sm:col-span-4 flex items-center gap-1 bg-[#1a1a1a] border border-white/20 px-2 py-1">
          <Calendar className="w-3.5 h-3.5 text-white/50 shrink-0" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent text-white text-[10px] outline-none w-1/2 cursor-pointer"
            title="開始日"
          />
          <span className="text-white/40 text-[10px]">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent text-white text-[10px] outline-none w-1/2 cursor-pointer"
            title="終了日"
          />
        </div>
      </div>

      {/* ログ一覧 */}
      <div 
        ref={logContainerRef}
        className="flex-1 overflow-y-auto max-h-[300px] font-mono text-[11px] leading-relaxed space-y-1 pr-1 scrollbar-thin select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-white/40 text-xs italic">
            条件に致するログが見つかりません
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 break-all hover:bg-white/5 px-1 py-0.5 rounded-none">
              <span className="text-[#8B8985] shrink-0">[{log.timestamp}]</span>
              <span className={`shrink-0 uppercase font-bold text-[10px] px-1 py-0.2 rounded-none border ${
                log.level === 'Error' ? 'bg-red-900/60 text-red-200 border-red-600' :
                log.level === 'Warning' ? 'bg-amber-900/60 text-amber-200 border-amber-600' :
                log.level === 'Debug' ? 'bg-blue-900/60 text-blue-200 border-blue-600' :
                'bg-gray-800 text-gray-200 border-gray-600'
              }`}>
                {log.level}
              </span>
              <span className="text-amber-400/90 font-semibold shrink-0">[{log.source}]</span>
              <span className="text-[#E4E3E0]">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

LogViewer.displayName = 'LogViewer';


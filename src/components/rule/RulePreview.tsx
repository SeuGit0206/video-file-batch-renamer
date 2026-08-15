import React, { useState, useCallback, useMemo } from 'react';
import { Play, CheckCircle2, XCircle, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import type { RuleDefinition, RuleEngineExecutionSummary } from '../../types/rule';
import type { RuleEngine } from '../../services/rule/RuleEngine';

export interface RulePreviewProps {
  rules: RuleDefinition[];
  ruleEngine: RuleEngine;
  initialInput?: Record<string, unknown>;
}

const DEFAULT_SAMPLE_INPUT = {
  title: 'sample_movie_2026_v1.mp4',
  category: 'uncategorized',
  meta: {
    codec: 'h264',
    bitrate: '5000k',
  },
};

export const RulePreview: React.FC<RulePreviewProps> = React.memo(({
  rules,
  ruleEngine,
  initialInput = DEFAULT_SAMPLE_INPUT,
}) => {
  const [inputText, setInputText] = useState<string>(() => JSON.stringify(initialInput, null, 2));
  const [stopOnFirstMatch, setStopOnFirstMatch] = useState<boolean>(false);
  const [summary, setSummary] = useState<RuleEngineExecutionSummary | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // プレビュー実行
  const handleRunPreview = useCallback(() => {
    setParseError(null);
    let parsedInput: Record<string, unknown>;

    try {
      parsedInput = JSON.parse(inputText);
    } catch (err) {
      setParseError('入力データが正しいJSON形式ではありません: ' + (err instanceof Error ? err.message : String(err)));
      setSummary(null);
      return;
    }

    try {
      const result = ruleEngine.execute({
        input: parsedInput,
        rules,
        stopOnFirstMatch,
      });
      setSummary(result);
    } catch (err) {
      setParseError('ルール評価中にエラーが発生しました: ' + (err instanceof Error ? err.message : String(err)));
      setSummary(null);
    }
  }, [inputText, ruleEngine, rules, stopOnFirstMatch]);

  // 全変更箇所の抽出
  const allChanges = useMemo(() => {
    if (!summary) return [];
    return summary.results.filter((r) => r.applied).flatMap((r) => r.changes);
  }, [summary]);

  return (
    <div className="flex flex-col gap-4 text-xs font-sans">
      {/* 評価実行設定 & ボタン */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 border border-gray-200 rounded">
        <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gray-700">
          <input
            type="checkbox"
            checked={stopOnFirstMatch}
            onChange={(e) => setStopOnFirstMatch(e.target.checked)}
            className="rounded text-indigo-600"
          />
          <span>最初のマッチで停止 (stopOnFirstMatch)</span>
        </label>

        <button
          type="button"
          onClick={handleRunPreview}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>ルール評価プレビュー実行</span>
        </button>
      </div>

      {/* エラー表示 */}
      {parseError && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded flex items-start gap-1.5">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{parseError}</span>
        </div>
      )}

      {/* 入力 JSON 設定 */}
      <div className="flex flex-col gap-1">
        <label className="font-bold text-gray-700">評価対象データ (JSON Input)</label>
        <textarea
          rows={5}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="p-2 border border-gray-300 rounded font-mono text-[11px] bg-white focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* プレビュー結果表示 */}
      {summary && (
        <div className="flex flex-col gap-3 pt-3 border-t border-gray-200">
          {/* サマリーヘッダー */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded">
            <div className="flex items-center gap-3">
              <span className="font-bold text-indigo-900">
                評価結果: <span className="text-indigo-700">{summary.totalApplied}件</span> のルール適用
              </span>
              <span className="flex items-center gap-1 text-gray-600 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                {summary.totalExecutionTimeMs.toFixed(2)} ms
              </span>
            </div>
          </div>

          {/* Before / After 比較 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="font-bold text-gray-700">Before (変換前)</span>
              <pre className="p-2.5 bg-gray-50 border border-gray-300 rounded font-mono text-[11px] max-h-48 overflow-auto">
                {JSON.stringify(summary.input, null, 2)}
              </pre>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-bold text-gray-700">After (変換後)</span>
              <pre className="p-2.5 bg-green-50 border border-green-300 text-green-950 rounded font-mono text-[11px] max-h-48 overflow-auto">
                {JSON.stringify(summary.output, null, 2)}
              </pre>
            </div>
          </div>

          {/* 変更箇所リスト */}
          {allChanges.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="font-bold text-gray-700">差分フィールド変更一覧 ({allChanges.length}件)</span>
              <div className="flex flex-col gap-1.5 max-h-36 overflow-auto">
                {allChanges.map((ch, idx) => (
                  <div key={idx} className="p-2 bg-amber-50 border border-amber-200 rounded flex items-center gap-2 font-mono text-[11px]">
                    <span className="font-bold text-amber-900 shrink-0">{ch.field}:</span>
                    <span className="text-gray-600 line-through truncate max-w-[150px]">
                      {JSON.stringify(ch.oldValue)}
                    </span>
                    <ArrowRight className="w-3 h-3 text-amber-600 shrink-0" />
                    <span className="text-green-700 font-bold truncate max-w-[200px]">
                      {JSON.stringify(ch.newValue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 実行されたルール結果詳細 */}
          <div className="flex flex-col gap-1.5">
            <span className="font-bold text-gray-700">ルール実行ログ</span>
            <div className="flex flex-col gap-1.5 max-h-48 overflow-auto pr-1">
              {summary.results.map((res) => (
                <div
                  key={res.ruleId}
                  className={`p-2 border rounded flex items-start justify-between gap-2 ${
                    res.applied
                      ? res.success
                        ? 'bg-green-50/50 border-green-200'
                        : 'bg-red-50/50 border-red-200'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    {res.applied ? (
                      res.success ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      )
                    ) : (
                      <span className="text-[10px] px-1 py-0.5 bg-gray-200 rounded text-gray-600 font-bold shrink-0 mt-0.5">
                        スキップ
                      </span>
                    )}

                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-gray-900 truncate">{res.ruleName}</span>
                      {res.skippedReason && (
                        <span className="text-[10px] text-gray-500">{res.skippedReason}</span>
                      )}
                      {res.error && (
                        <span className="text-[10px] text-red-600 font-bold">{res.error}</span>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-gray-400 shrink-0">
                    {res.executionTimeMs.toFixed(2)}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

RulePreview.displayName = 'RulePreview';

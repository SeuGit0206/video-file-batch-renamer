import React from 'react';
import { Plus, Trash2, Edit2, ArrowUp, ArrowDown, CheckCircle2, XCircle } from 'lucide-react';
import type { RuleDefinition } from '../../types/rule';

export interface RuleListProps {
  rules: RuleDefinition[];
  onToggleRule?: (ruleId: string, enabled: boolean) => void;
  onEditRule?: (rule: RuleDefinition) => void;
  onDeleteRule?: (ruleId: string) => void;
  onMoveRule?: (ruleId: string, direction: 'up' | 'down') => void;
  onAddRule?: () => void;
}

export const RuleList: React.FC<RuleListProps> = React.memo(({
  rules,
  onToggleRule,
  onEditRule,
  onDeleteRule,
  onMoveRule,
  onAddRule,
}) => {
  // Priority昇順でソートして表示
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
          ルール一覧 ({rules.length}件)
        </h3>
        {onAddRule && (
          <button
            type="button"
            onClick={onAddRule}
            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新規ルール追加</span>
          </button>
        )}
      </div>

      {sortedRules.length === 0 ? (
        <div className="p-6 border-2 border-dashed border-gray-300 rounded text-center text-xs text-gray-500">
          登録されているルールがありません。「新規ルール追加」から作成してください。
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
          {sortedRules.map((rule, index) => (
            <div
              key={rule.id}
              className={`p-3 border rounded flex items-center justify-between gap-3 transition-colors ${
                rule.enabled ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => onToggleRule?.(rule.id, !rule.enabled)}
                  className="cursor-pointer text-gray-500 hover:text-indigo-600 shrink-0"
                  title={rule.enabled ? '無効化する' : '有効化する'}
                >
                  {rule.enabled ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-gray-900 truncate">{rule.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono text-gray-600 shrink-0">
                      Priority: {rule.priority}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded shrink-0">
                      {rule.conditionOperator}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 truncate mt-0.5">
                    {rule.description || `条件: ${rule.conditions.length}件 / アクション: ${rule.actions.length}件`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {onMoveRule && (
                  <>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => onMoveRule(rule.id, 'up')}
                      className="p-1 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 cursor-pointer"
                      title="優先度を上げる"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === sortedRules.length - 1}
                      onClick={() => onMoveRule(rule.id, 'down')}
                      className="p-1 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 cursor-pointer"
                      title="優先度を下げる"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                {onEditRule && (
                  <button
                    type="button"
                    onClick={() => onEditRule(rule)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                    title="編集"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {onDeleteRule && (
                  <button
                    type="button"
                    onClick={() => onDeleteRule(rule.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                    title="削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

RuleList.displayName = 'RuleList';

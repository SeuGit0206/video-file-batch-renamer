import React, { useCallback } from 'react';
import { Plus, Trash2, Check, X, AlertCircle } from 'lucide-react';
import type { RuleDefinition, RuleCondition, RuleAction, RuleOperator, RuleActionType, LogicalOperator } from '../../types/rule';

export interface RuleEditorProps {
  rule: RuleDefinition;
  onChange: (updatedRule: RuleDefinition) => void;
  onSave?: () => void;
  onCancel?: () => void;
  validationErrors?: string[];
}

const OPERATOR_OPTIONS: { value: RuleOperator; label: string }[] = [
  { value: 'equals', label: '一致 (=)' },
  { value: 'notEquals', label: '不一致 (!=)' },
  { value: 'contains', label: '含む (contains)' },
  { value: 'notContains', label: '含まない (notContains)' },
  { value: 'startsWith', label: '前方一致 (startsWith)' },
  { value: 'endsWith', label: '後方一致 (endsWith)' },
  { value: 'regex', label: '正規表現 (regex)' },
  { value: 'greaterThan', label: 'より大きい (>)' },
  { value: 'lessThan', label: 'より小さい (<)' },
  { value: 'in', label: 'いずれかに一致 (in)' },
  { value: 'exists', label: 'フィールドが存在 (exists)' },
];

const ACTION_TYPE_OPTIONS: { value: RuleActionType; label: string }[] = [
  { value: 'replace', label: '文字列置換 (replace)' },
  { value: 'prepend', label: '接頭辞追加 (prepend)' },
  { value: 'append', label: '接尾辞追加 (append)' },
  { value: 'regexReplace', label: '正規表現置換 (regexReplace)' },
  { value: 'uppercase', label: '大文字変換 (uppercase)' },
  { value: 'lowercase', label: '小文字変換 (lowercase)' },
  { value: 'remove', label: 'フィールド削除 (remove)' },
  { value: 'setMeta', label: 'メタデータ設定 (setMeta)' },
];

export const RuleEditor: React.FC<RuleEditorProps> = React.memo(({
  rule,
  onChange,
  onSave,
  onCancel,
  validationErrors = [],
}) => {
  // 基本フィールドの変更
  const handleFieldChange = useCallback((field: keyof RuleDefinition, value: unknown) => {
    onChange({
      ...rule,
      [field]: value,
      updatedAt: new Date().toISOString(),
    });
  }, [onChange, rule]);

  // 条件追加
  const handleAddCondition = useCallback(() => {
    const newCond: RuleCondition = {
      id: `cond_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      field: 'title',
      operator: 'contains',
      value: '',
    };
    onChange({
      ...rule,
      conditions: [...rule.conditions, newCond],
      updatedAt: new Date().toISOString(),
    });
  }, [onChange, rule]);

  // 条件更新
  const handleUpdateCondition = useCallback((id: string, updatedFields: Partial<RuleCondition>) => {
    const updatedConditions = rule.conditions.map((cond) =>
      cond.id === id ? { ...cond, ...updatedFields } : cond
    );
    onChange({
      ...rule,
      conditions: updatedConditions,
      updatedAt: new Date().toISOString(),
    });
  }, [onChange, rule]);

  // 条件削除
  const handleRemoveCondition = useCallback((id: string) => {
    onChange({
      ...rule,
      conditions: rule.conditions.filter((cond) => cond.id !== id),
      updatedAt: new Date().toISOString(),
    });
  }, [onChange, rule]);

  // アクション追加
  const handleAddAction = useCallback(() => {
    const newAction: RuleAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'uppercase',
      targetField: 'title',
    };
    onChange({
      ...rule,
      actions: [...rule.actions, newAction],
      updatedAt: new Date().toISOString(),
    });
  }, [onChange, rule]);

  // アクション更新
  const handleUpdateAction = useCallback((id: string, updatedFields: Partial<RuleAction>) => {
    const updatedActions = rule.actions.map((act) =>
      act.id === id ? { ...act, ...updatedFields } : act
    );
    onChange({
      ...rule,
      actions: updatedActions,
      updatedAt: new Date().toISOString(),
    });
  }, [onChange, rule]);

  // アクション削除
  const handleRemoveAction = useCallback((id: string) => {
    onChange({
      ...rule,
      actions: rule.actions.filter((act) => act.id !== id),
      updatedAt: new Date().toISOString(),
    });
  }, [onChange, rule]);

  return (
    <div className="flex flex-col gap-4 p-4 bg-white border border-gray-300 rounded text-xs font-sans">
      {/* エラー表示 */}
      {validationErrors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded flex flex-col gap-1">
          <div className="font-bold flex items-center gap-1">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>入力内容にエラーがあります:</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 基本設定 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 flex flex-col gap-1">
          <label className="font-bold text-gray-700">ルール名 <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={rule.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="例: タイトル大文字化ルール"
            className="p-2 border border-gray-300 rounded font-medium focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-4 pt-4">
          <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gray-700">
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={(e) => handleFieldChange('enabled', e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span>有効 (enabled)</span>
          </label>

          <div className="flex items-center gap-1.5">
            <label className="font-bold text-gray-700">優先度:</label>
            <input
              type="number"
              value={rule.priority}
              onChange={(e) => handleFieldChange('priority', Number(e.target.value))}
              className="w-16 p-1.5 border border-gray-300 rounded font-mono text-center"
            />
          </div>
        </div>
      </div>

      {/* 説明 */}
      <div className="flex flex-col gap-1">
        <label className="font-bold text-gray-700">説明 (任意)</label>
        <input
          type="text"
          value={rule.description || ''}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          placeholder="例: 動画のタイトルに含まれる特定文字列を自動置換する"
          className="p-2 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* 条件セクション (Conditions) */}
      <div className="flex flex-col gap-2 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800">評価条件 (Conditions)</span>
            <select
              value={rule.conditionOperator}
              onChange={(e) => handleFieldChange('conditionOperator', e.target.value as LogicalOperator)}
              className="p-1 border border-indigo-300 bg-indigo-50 text-indigo-700 font-bold rounded"
            >
              <option value="AND">すべての条件に一致 (AND)</option>
              <option value="OR">いずれかの条件に一致 (OR)</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleAddCondition}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded border border-gray-300 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>条件追加</span>
          </button>
        </div>

        {rule.conditions.length === 0 ? (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded text-gray-500 text-center">
            条件が指定されていません（無条件で常に実行されます）
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rule.conditions.map((cond) => (
              <div key={cond.id} className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded">
                <input
                  type="text"
                  value={cond.field}
                  onChange={(e) => handleUpdateCondition(cond.id, { field: e.target.value })}
                  placeholder="対象フィールド (例: title)"
                  className="w-32 p-1.5 border border-gray-300 rounded font-mono"
                />

                <select
                  value={cond.operator}
                  onChange={(e) => handleUpdateCondition(cond.id, { operator: e.target.value as RuleOperator })}
                  className="p-1.5 border border-gray-300 rounded bg-white"
                >
                  {OPERATOR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {cond.operator !== 'exists' && (
                  <input
                    type="text"
                    value={String(cond.value ?? '')}
                    onChange={(e) => handleUpdateCondition(cond.id, { value: e.target.value })}
                    placeholder="値 (例: h264)"
                    className="flex-1 min-w-[120px] p-1.5 border border-gray-300 rounded"
                  />
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveCondition(cond.id)}
                  className="p-1.5 text-red-600 hover:bg-red-100 rounded cursor-pointer ml-auto"
                  title="条件削除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* アクションセクション (Actions) */}
      <div className="flex flex-col gap-2 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="font-bold text-gray-800">実行アクション (Actions)</span>
          <button
            type="button"
            onClick={handleAddAction}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded border border-gray-300 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>アクション追加</span>
          </button>
        </div>

        {rule.actions.length === 0 ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-center">
            アクションが設定されていません（最低1つのアクションが必要です）
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rule.actions.map((act) => (
              <div key={act.id} className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded">
                <input
                  type="text"
                  value={act.targetField}
                  onChange={(e) => handleUpdateAction(act.id, { targetField: e.target.value })}
                  placeholder="対象フィールド"
                  className="w-32 p-1.5 border border-gray-300 rounded font-mono"
                />

                <select
                  value={act.type}
                  onChange={(e) => handleUpdateAction(act.id, { type: e.target.value as RuleActionType })}
                  className="p-1.5 border border-gray-300 rounded bg-white"
                >
                  {ACTION_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* アクションタイプに応じた入力フィールド */}
                {['replace', 'prepend', 'append', 'setMeta'].includes(act.type) && (
                  <input
                    type="text"
                    value={act.value ?? ''}
                    onChange={(e) => handleUpdateAction(act.id, { value: e.target.value })}
                    placeholder="適用文字列/値"
                    className="flex-1 min-w-[120px] p-1.5 border border-gray-300 rounded"
                  />
                )}

                {act.type === 'regexReplace' && (
                  <>
                    <input
                      type="text"
                      value={act.pattern ?? ''}
                      onChange={(e) => handleUpdateAction(act.id, { pattern: e.target.value })}
                      placeholder="正規表現パターン (例: \\d+)"
                      className="w-36 p-1.5 border border-gray-300 rounded font-mono"
                    />
                    <input
                      type="text"
                      value={act.replacement ?? ''}
                      onChange={(e) => handleUpdateAction(act.id, { replacement: e.target.value })}
                      placeholder="置換後文字列"
                      className="flex-1 min-w-[100px] p-1.5 border border-gray-300 rounded"
                    />
                  </>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveAction(act.id)}
                  className="p-1.5 text-red-600 hover:bg-red-100 rounded cursor-pointer ml-auto"
                  title="アクション削除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* アクションボタン (保存 / キャンセル) */}
      {(onSave || onCancel) && (
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 mt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded border border-gray-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>キャンセル</span>
            </button>
          )}

          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className="inline-flex items-center gap-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>ルール保存</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
});

RuleEditor.displayName = 'RuleEditor';

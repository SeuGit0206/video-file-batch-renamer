import React, { useState, useCallback, useMemo } from 'react';
import { Sliders, X, List, Edit3, Bookmark, Eye } from 'lucide-react';
import type { RuleDefinition, RulePreset } from '../../types/rule';
import type { RuleEngine } from '../../services/rule/RuleEngine';
import type { RulePresetService } from '../../services/rule/RulePresetService';
import { container } from '../../composition/container';
import { RuleList } from './RuleList';
import { RuleEditor } from './RuleEditor';
import { RulePresetPanel } from './RulePresetPanel';
import { RulePreview } from './RulePreview';

export interface RuleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  ruleEngine?: RuleEngine;
  presetService?: RulePresetService;
  initialRules?: RuleDefinition[];
  onRulesChange?: (rules: RuleDefinition[]) => void;
}

type TabType = 'list' | 'editor' | 'preset' | 'preview';

export const RuleEditorModal: React.FC<RuleEditorModalProps> = React.memo(({
  isOpen,
  onClose,
  ruleEngine,
  presetService,
  initialRules = [],
  onRulesChange,
}) => {
  // DI 解決: 指定されていない場合は container から取得
  const resolvedEngine = useMemo(() => {
    if (ruleEngine) return ruleEngine;
    const EvaluatorClass = container.getRuleEvaluator();
    const EngineClass = container.getRuleEngine();
    return new EngineClass(new EvaluatorClass());
  }, [ruleEngine]);

  const resolvedPresetService = useMemo(() => {
    if (presetService) return presetService;
    const ServiceClass = container.getRulePresetService();
    return new ServiceClass(resolvedEngine);
  }, [presetService, resolvedEngine]);

  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [rules, setRules] = useState<RuleDefinition[]>(initialRules);
  const [editingRule, setEditingRule] = useState<RuleDefinition | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // ルール一覧の更新
  const updateRules = useCallback((newRules: RuleDefinition[]) => {
    setRules(newRules);
    onRulesChange?.(newRules);
  }, [onRulesChange]);

  // 新規ルールの作成開始
  const handleStartAddRule = useCallback(() => {
    const newRule: RuleDefinition = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `新規ルール ${rules.length + 1}`,
      enabled: true,
      priority: rules.length + 1,
      conditionOperator: 'AND',
      conditions: [],
      actions: [
        {
          id: `act_${Date.now()}`,
          type: 'uppercase',
          targetField: 'title',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingRule(newRule);
    setValidationErrors([]);
    setActiveTab('editor');
  }, [rules.length]);

  // ルール編集開始
  const handleStartEditRule = useCallback((rule: RuleDefinition) => {
    setEditingRule({ ...rule });
    setValidationErrors([]);
    setActiveTab('editor');
  }, []);

  // ルールの有効化/無効化切替
  const handleToggleRule = useCallback((ruleId: string, enabled: boolean) => {
    const updated = rules.map((r) => (r.id === ruleId ? { ...r, enabled, updatedAt: new Date().toISOString() } : r));
    updateRules(updated);
  }, [rules, updateRules]);

  // ルール削除
  const handleDeleteRule = useCallback((ruleId: string) => {
    const updated = rules.filter((r) => r.id !== ruleId);
    updateRules(updated);
  }, [rules, updateRules]);

  // ルールの順序移動
  const handleMoveRule = useCallback((ruleId: string, direction: 'up' | 'down') => {
    const sorted = [...rules].sort((a, b) => a.priority - b.priority);
    const index = sorted.findIndex((r) => r.id === ruleId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    // Priority 値をスワップ
    const currentRule = sorted[index];
    const targetRule = sorted[targetIndex];

    const tempPriority = currentRule.priority;
    currentRule.priority = targetRule.priority;
    targetRule.priority = tempPriority;

    updateRules([...sorted]);
  }, [rules, updateRules]);

  // 編集中のルール保存
  const handleSaveEditingRule = useCallback(() => {
    if (!editingRule) return;

    // バリデーションチェック (RuleEngine経由)
    const valRes = resolvedEngine.validateRule(editingRule);
    if (!valRes.valid) {
      setValidationErrors(valRes.errors);
      return;
    }

    const existsIndex = rules.findIndex((r) => r.id === editingRule.id);
    let updatedRules: RuleDefinition[];

    if (existsIndex >= 0) {
      updatedRules = rules.map((r) => (r.id === editingRule.id ? editingRule : r));
    } else {
      updatedRules = [...rules, editingRule];
    }

    updateRules(updatedRules);
    setEditingRule(null);
    setValidationErrors([]);
    setActiveTab('list');
  }, [editingRule, resolvedEngine, rules, updateRules]);

  // 編集キャンセル
  const handleCancelEditingRule = useCallback(() => {
    setEditingRule(null);
    setValidationErrors([]);
    setActiveTab('list');
  }, []);

  // プリセット読み込み
  const handleLoadPreset = useCallback((preset: RulePreset) => {
    updateRules(preset.rules || []);
    setActiveTab('list');
  }, [updateRules]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-[#141414] max-w-2xl w-full p-5 shadow-2xl flex flex-col gap-4 font-sans max-h-[90vh] overflow-y-auto">
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between border-b border-[#141414]/20 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-base text-[#141414]">Dynamic Rule Engine 設定・編集</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#141414] hover:bg-[#141414] hover:text-white p-1 border border-[#141414] text-xs font-bold cursor-pointer"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ナビゲーションタブ */}
        <div className="flex items-center gap-1 border-b border-gray-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-1.5 px-3 py-2 font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'list'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>ルール一覧 ({rules.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!editingRule && rules.length > 0) {
                setEditingRule(rules[0]);
              } else if (!editingRule) {
                handleStartAddRule();
                return;
              }
              setActiveTab('editor');
            }}
            className={`flex items-center gap-1.5 px-3 py-2 font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'editor'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>ルール編集</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preset')}
            className={`flex items-center gap-1.5 px-3 py-2 font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'preset'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>プリセット管理</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-2 font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'preview'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>評価プレビュー</span>
          </button>
        </div>

        {/* タブコンテンツ */}
        <div className="py-1">
          {activeTab === 'list' && (
            <RuleList
              rules={rules}
              onToggleRule={handleToggleRule}
              onEditRule={handleStartEditRule}
              onDeleteRule={handleDeleteRule}
              onMoveRule={handleMoveRule}
              onAddRule={handleStartAddRule}
            />
          )}

          {activeTab === 'editor' && (
            editingRule ? (
              <RuleEditor
                rule={editingRule}
                onChange={setEditingRule}
                onSave={handleSaveEditingRule}
                onCancel={handleCancelEditingRule}
                validationErrors={validationErrors}
              />
            ) : (
              <div className="p-6 border border-gray-200 rounded text-center text-xs text-gray-500">
                編集対象のルールが選択されていません。「ルール一覧」からルールを選択するか新規追加してください。
              </div>
            )
          )}

          {activeTab === 'preset' && (
            <RulePresetPanel
              presetService={resolvedPresetService}
              currentRules={rules}
              onLoadPreset={handleLoadPreset}
            />
          )}

          {activeTab === 'preview' && (
            <RulePreview
              rules={rules}
              ruleEngine={resolvedEngine}
            />
          )}
        </div>

        {/* モーダルフッター */}
        <div className="flex items-center justify-end border-t border-gray-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded border border-gray-300 cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
});

RuleEditorModal.displayName = 'RuleEditorModal';

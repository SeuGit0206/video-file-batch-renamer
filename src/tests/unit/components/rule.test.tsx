// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RuleEvaluator } from '../../../services/rule/RuleEvaluator';
import { RuleEngine } from '../../../services/rule/RuleEngine';
import { RulePresetService } from '../../../services/rule/RulePresetService';
import type { RuleDefinition } from '../../../types/rule';

import { RuleList } from '../../../components/rule/RuleList';
import { RuleEditor } from '../../../components/rule/RuleEditor';
import { RulePresetPanel } from '../../../components/rule/RulePresetPanel';
import { RulePreview } from '../../../components/rule/RulePreview';
import { RuleEditorModal } from '../../../components/rule/RuleEditorModal';

describe('Phase64 Step7: Rule Engine UI Components Unit & Integration Tests', () => {
  const evaluator = new RuleEvaluator();
  const engine = new RuleEngine(evaluator);
  let presetService: RulePresetService;

  const sampleRules: RuleDefinition[] = [
    {
      id: 'r1',
      name: 'Rule 1 Title Uppercase',
      description: 'Convert title to uppercase',
      enabled: true,
      priority: 1,
      conditionOperator: 'AND',
      conditions: [{ id: 'c1', field: 'title', operator: 'contains', value: 'video' }],
      actions: [{ id: 'a1', type: 'uppercase', targetField: 'title' }],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'r2',
      name: 'Rule 2 Disabled Append',
      description: 'Append suffix',
      enabled: false,
      priority: 2,
      conditionOperator: 'OR',
      conditions: [],
      actions: [{ id: 'a2', type: 'append', targetField: 'title', value: '_v2' }],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    presetService = new RulePresetService(engine);
  });

  describe('1. RuleList Component', () => {
    it('ルール一覧が正しく描画されること', () => {
      render(
        <RuleList
          rules={sampleRules}
        />
      );

      expect(screen.getByText(/ルール一覧 \(2件\)/)).toBeInTheDocument();
      expect(screen.getByText('Rule 1 Title Uppercase')).toBeInTheDocument();
      expect(screen.getByText('Rule 2 Disabled Append')).toBeInTheDocument();
    });

    it('トグル、編集、削除、追加ボタンのコールバックが正しく発火すること', () => {
      const onToggle = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const onAdd = vi.fn();

      render(
        <RuleList
          rules={sampleRules}
          onToggleRule={onToggle}
          onEditRule={onEdit}
          onDeleteRule={onDelete}
          onAddRule={onAdd}
        />
      );

      // 新規ルール追加ボタン
      const addButton = screen.getByText('新規ルール追加');
      fireEvent.click(addButton);
      expect(onAdd).toHaveBeenCalledTimes(1);

      // 編集ボタン
      const editButtons = screen.getAllByTitle('編集');
      fireEvent.click(editButtons[0]);
      expect(onEdit).toHaveBeenCalledWith(sampleRules[0]);

      // 削除ボタン
      const deleteButtons = screen.getAllByTitle('削除');
      fireEvent.click(deleteButtons[0]);
      expect(onDelete).toHaveBeenCalledWith('r1');

      // トグルボタン
      const toggleButtons = screen.getAllByTitle('無効化する');
      fireEvent.click(toggleButtons[0]);
      expect(onToggle).toHaveBeenCalledWith('r1', false);
    });
  });

  describe('2. RuleEditor Component', () => {
    it('ルール編集入力項目が正しく表示され、変更コールバックが動作すること', () => {
      const onChange = vi.fn();
      const onSave = vi.fn();

      render(
        <RuleEditor
          rule={sampleRules[0]}
          onChange={onChange}
          onSave={onSave}
        />
      );

      const nameInput = screen.getByDisplayValue('Rule 1 Title Uppercase');
      fireEvent.change(nameInput, { target: { value: 'Updated Rule Name' } });

      expect(onChange).toHaveBeenCalled();

      const saveButton = screen.getByText('ルール保存');
      fireEvent.click(saveButton);
      expect(onSave).toHaveBeenCalled();
    });

    it('バリデーションエラーが発生した場合にエラー一覧が表示されること', () => {
      render(
        <RuleEditor
          rule={sampleRules[0]}
          onChange={vi.fn()}
          validationErrors={['ルール名は必須です。', 'アクションが指定されていません。']}
        />
      );

      expect(screen.getByText('入力内容にエラーがあります:')).toBeInTheDocument();
      expect(screen.getByText('ルール名は必須です。')).toBeInTheDocument();
      expect(screen.getByText('アクションが指定されていません。')).toBeInTheDocument();
    });
  });

  describe('3. RulePresetPanel Component', () => {
    it('プリセットの保存と読み込み、削除が正しく動作すること', async () => {
      const onLoadPreset = vi.fn();
      const onPresetSaved = vi.fn();

      render(
        <RulePresetPanel
          presetService={presetService}
          currentRules={sampleRules}
          onLoadPreset={onLoadPreset}
          onPresetSaved={onPresetSaved}
        />
      );

      // 新規保存
      const nameInput = screen.getByPlaceholderText('プリセット名 *');
      fireEvent.change(nameInput, { target: { value: 'My Test Preset' } });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('プリセット "My Test Preset" を保存しました。')).toBeInTheDocument();
      });

      expect(onPresetSaved).toHaveBeenCalled();

      // 一覧に表示されているか確認
      expect(screen.getByText('My Test Preset')).toBeInTheDocument();

      // 読込ボタンクリック
      const loadButton = screen.getByText('読込');
      fireEvent.click(loadButton);

      expect(onLoadPreset).toHaveBeenCalled();

      // 削除ボタンクリック
      const deleteButton = screen.getByTitle('プリセット削除');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('プリセット "My Test Preset" を削除しました。')).toBeInTheDocument();
      });
    });
  });

  describe('4. RulePreview Component', () => {
    it('JSON入力を評価してプレビュー結果が描画されること', () => {
      render(
        <RulePreview
          rules={sampleRules}
          ruleEngine={engine}
          initialInput={{ title: 'video_clip.mp4' }}
        />
      );

      const runButton = screen.getByText('ルール評価プレビュー実行');
      fireEvent.click(runButton);

      expect(screen.getByText(/評価結果:/)).toBeInTheDocument();
      expect(screen.getByText('1件')).toBeInTheDocument();
      expect(screen.getByText('"VIDEO_CLIP.MP4"')).toBeInTheDocument();
    });

    it('不正なJSON入力でエラーが表示されること', () => {
      render(
        <RulePreview
          rules={sampleRules}
          ruleEngine={engine}
          initialInput={{ title: 'test' }}
        />
      );

      const textarea = screen.getByDisplayValue(/{\s*"title": "test"\s*}/);
      fireEvent.change(textarea, { target: { value: '{ invalid_json:' } });

      const runButton = screen.getByText('ルール評価プレビュー実行');
      fireEvent.click(runButton);

      expect(screen.getByText(/入力データが正しいJSON形式ではありません/)).toBeInTheDocument();
    });
  });

  describe('5. RuleEditorModal Component (統合テスト)', () => {
    it('モーダルの開閉およびタブ切替が正常に機能すること', () => {
      const onClose = vi.fn();

      const { rerender } = render(
        <RuleEditorModal
          isOpen={false}
          onClose={onClose}
          ruleEngine={engine}
          presetService={presetService}
          initialRules={sampleRules}
        />
      );

      expect(screen.queryByText('Dynamic Rule Engine 設定・編集')).not.toBeInTheDocument();

      rerender(
        <RuleEditorModal
          isOpen={true}
          onClose={onClose}
          ruleEngine={engine}
          presetService={presetService}
          initialRules={sampleRules}
        />
      );

      expect(screen.getByText('Dynamic Rule Engine 設定・編集')).toBeInTheDocument();

      // タブ切替: プリセット管理
      const presetTab = screen.getByText('プリセット管理');
      fireEvent.click(presetTab);
      expect(screen.getByText('現在のルールセットをプリセット保存')).toBeInTheDocument();

      // タブ切替: 評価プレビュー
      const previewTab = screen.getByText('評価プレビュー');
      fireEvent.click(previewTab);
      expect(screen.getByText('評価対象データ (JSON Input)')).toBeInTheDocument();

      // モーダルクローズ
      const closeButtons = screen.getAllByRole('button', { name: /閉じる/ });
      fireEvent.click(closeButtons[0]);
      expect(onClose).toHaveBeenCalled();
    });
  });
});

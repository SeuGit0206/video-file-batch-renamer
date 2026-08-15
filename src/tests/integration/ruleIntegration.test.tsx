// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import App from '../../App';
import { Header } from '../../components/Header';
import { container } from '../../composition/container';

describe('Phase64 Rule Engine Integration Test', () => {
  it('DIコンテナ(container)が RuleEngine と RulePresetService クラスを正しく提供できる', () => {
    const EngineClass = container.getRuleEngine();
    const EvaluatorClass = container.getRuleEvaluator();
    const PresetServiceClass = container.getRulePresetService();

    expect(EngineClass).toBeDefined();
    expect(EvaluatorClass).toBeDefined();
    expect(PresetServiceClass).toBeDefined();

    const engine = new EngineClass(new EvaluatorClass());
    const presetService = new PresetServiceClass(engine);

    expect(engine).toBeDefined();
    expect(presetService).toBeDefined();
  });

  it('Headerコンポーネント単体で Ruleボタンが表示され、クリックイベントが発生する', () => {
    const onOpenRuleModal = vi.fn();
    render(
      <Header
        activeTab="simulator"
        setActiveTab={vi.fn()}
        onOpenRuleModal={onOpenRuleModal}
      />
    );

    const ruleBtn = screen.getByRole('button', { name: /ルール/i });
    expect(ruleBtn).toBeInTheDocument();

    fireEvent.click(ruleBtn);
    expect(onOpenRuleModal).toHaveBeenCalledTimes(1);
  });

  it('App画面のHeaderルールボタンからモーダルを起動し、Rule保存、Preset操作、Preview実行、モーダル終了ができる', async () => {
    render(<App />);

    // Header のルールボタンを取得してモーダル起動
    const ruleBtn = screen.getByRole('button', { name: 'ルール' });
    expect(ruleBtn).toBeInTheDocument();

    fireEvent.click(ruleBtn);

    // モーダル表示確認
    expect(screen.getByText('Dynamic Rule Engine 設定・編集')).toBeInTheDocument();

    // 1. 新規ルール追加ボタンをクリックして編集画面へ移行 & 保存
    const addRuleBtn = screen.getByRole('button', { name: /新規ルール追加/i });
    fireEvent.click(addRuleBtn);

    // ルール名入力フィールドの更新
    const nameInput = screen.getByPlaceholderText(/例:.*大文字化ルール/i);
    fireEvent.change(nameInput, { target: { value: 'テスト大文字化ルール' } });

    // 保存ボタンをクリック
    const saveRuleBtn = screen.getByRole('button', { name: /ルール保存/i });
    fireEvent.click(saveRuleBtn);

    // ルール一覧タブに戻ってルールが追加されていることを確認
    await waitFor(() => {
      expect(screen.getByText('テスト大文字化ルール')).toBeInTheDocument();
    });

    // 2. プリセット管理タブへ移動 & プリセット保存テスト
    const presetTabBtn = screen.getByRole('button', { name: /プリセット管理/i });
    fireEvent.click(presetTabBtn);

    expect(screen.getByText('現在のルールセットをプリセット保存')).toBeInTheDocument();

    const presetNameInput = screen.getByPlaceholderText(/プリセット名/i);
    fireEvent.change(presetNameInput, { target: { value: 'テスト用プリセット' } });

    const savePresetBtn = screen.getByRole('button', { name: '保存' });
    fireEvent.click(savePresetBtn);

    await waitFor(() => {
      expect(screen.getByText('テスト用プリセット')).toBeInTheDocument();
    });

    // 3. 評価プレビュータブへ移動 & Rule Preview実行テスト
    const previewTabBtn = screen.getByRole('button', { name: /評価プレビュー/i });
    fireEvent.click(previewTabBtn);

    const runPreviewBtn = screen.getByRole('button', { name: /ルール評価プレビュー実行/i });
    fireEvent.click(runPreviewBtn);

    await waitFor(() => {
      expect(screen.getByText(/評価結果:/i)).toBeInTheDocument();
    });

    // 4. モーダルの終了
    const closeBtns = screen.getAllByRole('button', { name: '閉じる' });
    fireEvent.click(closeBtns[0]);

    await waitFor(() => {
      expect(screen.queryByText('Dynamic Rule Engine 設定・編集')).not.toBeInTheDocument();
    });
  });
});

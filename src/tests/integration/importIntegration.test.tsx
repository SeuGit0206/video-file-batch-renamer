// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import App from '../../App';
import { Header } from '../../components/Header';
import { container } from '../../composition/container';

describe('Phase63 Import System Integration Test', () => {
  it('DIコンテナが正しくインポート戦略ファクトリとバリデーションポリシーを解決できる', () => {
    const factory = container.getImportStrategyFactory();
    const policy = container.getImportValidationPolicy();

    expect(factory).toBeDefined();
    expect(policy).toBeDefined();

    const jsonService = factory.getService('json');
    expect(jsonService.format).toBe('json');

    const csvService = factory.getService('csv');
    expect(csvService.format).toBe('csv');
  });

  it('Headerコンポーネント単体でImportButtonが表示されクリックイベントが発生する', () => {
    const onOpenImportModal = vi.fn();
    render(
      <Header
        activeTab="simulator"
        setActiveTab={vi.fn()}
        onOpenImportModal={onOpenImportModal}
      />
    );

    const importBtn = screen.getByRole('button', { name: /インポート/i });
    expect(importBtn).toBeInTheDocument();

    fireEvent.click(importBtn);
    expect(onOpenImportModal).toHaveBeenCalledTimes(1);
  });

  it('App画面のインポートボタンからImportModalを開き、プレビュー表示、確定適用ができる', async () => {
    render(<App />);

    // Header のインポートボタンを取得
    const importBtn = screen.getByRole('button', { name: 'インポート' });
    expect(importBtn).toBeInTheDocument();

    // モーダルを開く
    fireEvent.click(importBtn);
    expect(screen.getByText('データインポート')).toBeInTheDocument();

    // テキスト入力エリアに JSON モックデータ入力
    const textarea = screen.getByLabelText(/またはデータを直接貼り付け/i);
    const mockJson = JSON.stringify({
      title: 'テストインポート',
      sourceFormat: 'json',
      target: 'history',
      items: [
        { id: 'f1', originalName: 'test.mp4', status: 'completed' }
      ]
    });
    fireEvent.change(textarea, { target: { value: mockJson } });

    // プレビュー表示実行 (プレビュー & 差分確認)
    const previewBtn = screen.getByRole('button', { name: /プレビュー & 差分確認/i });
    fireEvent.click(previewBtn);

    // ImportDiffViewerがレンダリングされ、「確定して適用」ボタンが表示されることを待機
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /確定して適用/i })).toBeInTheDocument();
    });

    // 確定して適用を実行
    const confirmBtn = screen.getByRole('button', { name: /確定して適用/i });
    fireEvent.click(confirmBtn);

    // インポート完了画面が表示されることを待機
    await waitFor(() => {
      expect(screen.getByText(/インポートが完了しました/i)).toBeInTheDocument();
    });

    // 「閉じる」ボタン（複数存在する可能性があるため全取得）をクリックしてモーダルを閉じる
    const closeBtns = screen.getAllByRole('button', { name: /閉じる/i });
    fireEvent.click(closeBtns[0]);

    await waitFor(() => {
      // モーダルが閉じる
      expect(screen.queryByText('データインポート')).not.toBeInTheDocument();
    });
  });

  it('ImportModalでキャンセルボタンを押すとモーダルが閉じる', async () => {
    render(<App />);

    const importBtn = screen.getByRole('button', { name: 'インポート' });
    fireEvent.click(importBtn);
    expect(screen.getByText('データインポート')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('データインポート')).not.toBeInTheDocument();
    });
  });
});

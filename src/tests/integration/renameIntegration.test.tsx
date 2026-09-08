// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom';
import App from '../../App';
import { container } from '../../composition/container';

describe('Rename Engine Integration Test (Phase 65)', () => {
  it('DIコンテナからリネーム関連サービスを取得できる', () => {
    const execServiceClass = container.getRenameExecutionService();
    const txClass = container.getRenameTransaction();
    const undoRedoClass = container.getRenameUndoRedoManager();

    expect(execServiceClass).toBeDefined();
    expect(txClass).toBeDefined();
    expect(undoRedoClass).toBeDefined();
  });

  it('App画面のリネーム実行ボタンからModalを起動し、一括実行およびUndo操作ができる', async () => {
    render(<App />);

    // 0. ファイル選択ダイアログ経由で動画ファイルを追加
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const testVideo = new File(['dummy content'], 'SSIS-001.mp4', { type: 'video/mp4' });
    fireEvent.change(fileInput, { target: { files: [testVideo] } });

    // 1. リネーム実行ボタンをクリック
    const physicalRenameBtn = screen.getByRole('button', { name: /^リネーム実行$/i });
    fireEvent.click(physicalRenameBtn);

    // Modalの起動確認
    await waitFor(() => {
      expect(screen.getByText('実ファイルリネーム実行エンジン')).toBeInTheDocument();
    });

    // 2. 一括実行ボタンをクリック
    const batchExecBtn = screen.getByRole('button', { name: /実ファイルリネーム一括実行/i });
    fireEvent.click(batchExecBtn);

    // 実行完了および成功表示の確認 (findByText で検索)
    const successText = await screen.findByText((content) => content.includes('リネームが成功しました'), {}, { timeout: 3000 });
    expect(successText).toBeInTheDocument();

    // 3. Undoボタンをクリックして取り消しができること
    const undoBtns = screen.getAllByRole('button', { name: /Undo/i });
    expect(undoBtns.length).toBeGreaterThan(0);
    fireEvent.click(undoBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Undo \(元に戻す\) を実行しました/i)).toBeInTheDocument();
    });

    // 4. Modalを閉じる
    const closeBtns = screen.getAllByRole('button', { name: '閉じる' });
    expect(closeBtns.length).toBeGreaterThan(0);
    fireEvent.click(closeBtns[0]);

    await waitFor(() => {
      expect(screen.queryByText('実ファイルリネーム実行エンジン')).not.toBeInTheDocument();
    });
  });
});

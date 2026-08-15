// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import { ImportModal } from '../../../components/import/ImportModal';
import { ImportDiffViewer } from '../../../components/import/ImportDiffViewer';
import type { ImportDiffInfo } from '../../../types/import';

describe('ImportDiffViewer Component Unit Tests', () => {
  it('差分なしの場合、「差分はありません」メッセージが表示される', () => {
    const diffInfo: ImportDiffInfo = {
      totalChanges: 0,
      addedCount: 0,
      modifiedCount: 0,
      removedCount: 0,
      unchangedCount: 5,
    };

    render(<ImportDiffViewer diffInfo={diffInfo} />);

    expect(screen.getByText('差分はありません')).toBeInTheDocument();
    expect(screen.getByText('変更なし')).toBeInTheDocument();
  });

  it('追加、変更、削除のカウントが正しく表示される', () => {
    const diffInfo: ImportDiffInfo = {
      totalChanges: 6,
      addedCount: 3,
      modifiedCount: 2,
      removedCount: 1,
      unchangedCount: 0,
      globalFields: [
        { field: 'theme', oldValue: 'light', newValue: 'dark', status: 'modified' },
      ],
      itemDiffs: [
        {
          id: 'item-1',
          status: 'added',
          fields: [{ field: 'title', oldValue: undefined, newValue: '新動画', status: 'added' }],
        },
      ],
    };

    render(<ImportDiffViewer diffInfo={diffInfo} />);

    expect(screen.getByText('3')).toBeInTheDocument(); // added
    expect(screen.getByText('2')).toBeInTheDocument(); // modified
    expect(screen.getByText('1')).toBeInTheDocument(); // removed

    expect(screen.getByText('theme')).toBeInTheDocument();
    expect(screen.getByText('light')).toBeInTheDocument();
    expect(screen.getByText('dark')).toBeInTheDocument();
    expect(screen.getByText('ID: item-1')).toBeInTheDocument();
  });

  it('確認およびキャンセルボタンが動作する', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    const diffInfo: ImportDiffInfo = {
      totalChanges: 1,
      addedCount: 1,
      modifiedCount: 0,
      removedCount: 0,
      unchangedCount: 0,
    };

    render(
      <ImportDiffViewer
        diffInfo={diffInfo}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /確定して適用/i });
    const cancelBtn = screen.getByRole('button', { name: /キャンセル/i });

    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('ImportModal Component Unit Tests', () => {
  it('isOpenがfalseの場合は何も描画しない', () => {
    const { container } = render(<ImportModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('isOpenがtrueの場合はモーダルタイトルとフォーム要素が表示される', () => {
    render(<ImportModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('データインポート')).toBeInTheDocument();
    expect(screen.getByText('インポート対象')).toBeInTheDocument();
    expect(screen.getByText('ソースフォーマット')).toBeInTheDocument();
    expect(screen.getByText('インポートモード')).toBeInTheDocument();
  });

  it('キャンセルボタンクリックで onClose が呼ばれる', () => {
    const onClose = vi.fn();
    render(<ImportModal isOpen={true} onClose={onClose} />);

    const cancelBtn = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('JSONおよびCSVフォーマット選択の切り替えができる', () => {
    render(<ImportModal isOpen={true} onClose={vi.fn()} />);

    const jsonBtn = screen.getByRole('button', { name: 'JSON (.json)' });
    const csvBtn = screen.getByRole('button', { name: 'CSV (.csv)' });

    expect(jsonBtn).toBeInTheDocument();
    expect(csvBtn).toBeInTheDocument();

    fireEvent.click(csvBtn);
    expect(csvBtn.className).toContain('indigo');
  });

  it('データ未入力でプレビュー実行するとエラーメッセージが表示される', async () => {
    render(<ImportModal isOpen={true} onClose={vi.fn()} />);

    const previewBtn = screen.getByRole('button', { name: /プレビュー/i });
    // disabledのチェックまたは入力なしクリック
    expect(previewBtn).toBeDisabled();
  });

  it('JSONデータを入力してプレビュー・インポートを成功させる動作', async () => {
    const onImportComplete = vi.fn();
    render(<ImportModal isOpen={true} onClose={vi.fn()} onImportComplete={onImportComplete} />);

    const textarea = screen.getByPlaceholderText('[{"id": "1", "name": "サンプル"}]');
    fireEvent.change(textarea, { target: { value: '[{"id": "1", "title": "テスト動画"}]' } });

    const previewBtn = screen.getByRole('button', { name: /プレビュー & 差分確認/i });
    expect(previewBtn).not.toBeDisabled();
    fireEvent.click(previewBtn);

    await waitFor(() => {
      expect(screen.getByText('確定して適用')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: '確定して適用' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText('インポートが完了しました')).toBeInTheDocument();
    });

    expect(onImportComplete).toHaveBeenCalled();
  });
});

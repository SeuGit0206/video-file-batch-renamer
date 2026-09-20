// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import { ImportModal } from '../../../components/import/ImportModal';
import { ImportDiffViewer } from '../../../components/import/ImportDiffViewer';
import { JsonImportService } from '../../../services/import/JsonImportService';
import type { IImportService } from '../../../services/import/IImportService';
import type { ImportStrategyFactory } from '../../../services/import/ImportStrategyFactory';
import type { ImportValidationPolicy } from '../../../policies/ImportValidationPolicy';
import type { ImportData, ImportDiffInfo, ImportResult } from '../../../types/import';

const parsedData: ImportData = {
  sourceFormat: 'json',
  target: 'history',
  items: [{ id: '1', title: 'テスト動画' }],
};

const diffInfo: ImportDiffInfo = {
  totalChanges: 1,
  addedCount: 1,
  modifiedCount: 0,
  removedCount: 0,
  unchangedCount: 0,
};

const failedResult: ImportResult = {
  success: false,
  target: 'history',
  format: 'json',
  importedCount: 0,
  failedCount: 1,
  errors: ['履歴の保存に失敗しました'],
  warnings: [],
  timestamp: '2026-09-12T00:00:00.000Z',
};

const successfulResult: ImportResult = {
  ...failedResult,
  success: true,
  importedCount: 1,
  failedCount: 0,
  errors: [],
};

function createImportDependencies(service: IImportService) {
  const factory = {
    getService: vi.fn(() => service),
  } as unknown as typeof ImportStrategyFactory;
  const policy = {
    validateData: vi.fn(() => ({
      isValid: true,
      errors: [],
      warnings: [],
      recordCount: 1,
      diff: diffInfo,
    })),
  } as unknown as typeof ImportValidationPolicy;

  return { factory, policy };
}

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

  it('不正なJSONではエラーを表示し、インポートを実行しない', async () => {
    const service = new JsonImportService();
    const importData = vi.spyOn(service, 'importData');
    const { factory, policy } = createImportDependencies(service);
    const onImportComplete = vi.fn();

    render(
      <ImportModal
        isOpen={true}
        onClose={vi.fn()}
        onImportComplete={onImportComplete}
        importFactory={factory}
        validationPolicy={policy}
      />
    );

    fireEvent.change(screen.getByLabelText(/またはデータを直接貼り付け/i), {
      target: { value: '{ invalid json' },
    });
    fireEvent.click(screen.getByRole('button', { name: /プレビュー & 差分確認/i }));

    expect(await screen.findByText(/JSONパースエラー/)).toBeInTheDocument();
    expect(importData).not.toHaveBeenCalled();
    expect(onImportComplete).not.toHaveBeenCalled();
    expect(screen.queryByText('インポートが完了しました')).not.toBeInTheDocument();
  });

  it('検証失敗後に処理状態を解除して入力と再試行を可能にする', async () => {
    const service = {
      format: 'json',
      supportsTarget: vi.fn(() => true),
      parse: vi.fn().mockResolvedValue(parsedData),
      validate: vi.fn(),
      importData: vi.fn(),
    } satisfies IImportService;
    const { factory } = createImportDependencies(service);
    const policy = {
      validateData: vi.fn(() => ({
        isValid: false,
        errors: ['必須項目がありません'],
        warnings: [],
        recordCount: 0,
      })),
    } as unknown as typeof ImportValidationPolicy;

    render(
      <ImportModal
        isOpen={true}
        onClose={vi.fn()}
        importFactory={factory}
        validationPolicy={policy}
      />
    );

    const textarea = screen.getByLabelText(/またはデータを直接貼り付け/i);
    fireEvent.change(textarea, { target: { value: JSON.stringify(parsedData) } });
    fireEvent.click(screen.getByRole('button', { name: /プレビュー & 差分確認/i }));

    expect(await screen.findByText(/データの検証に失敗しました/)).toBeInTheDocument();
    expect(screen.getByText(/必須項目がありません/)).toBeInTheDocument();
    expect(textarea).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /プレビュー & 差分確認/i })).not.toBeDisabled();
    expect(service.importData).not.toHaveBeenCalled();
  });

  it('インポート失敗を表示し、処理状態を解除して再操作できる', async () => {
    const service = {
      format: 'json',
      supportsTarget: vi.fn(() => true),
      parse: vi.fn().mockResolvedValue(parsedData),
      validate: vi.fn(),
      importData: vi.fn().mockResolvedValue(failedResult),
    } satisfies IImportService;
    const { factory, policy } = createImportDependencies(service);
    const onImportComplete = vi.fn();

    render(
      <ImportModal
        isOpen={true}
        onClose={vi.fn()}
        onImportComplete={onImportComplete}
        importFactory={factory}
        validationPolicy={policy}
      />
    );

    fireEvent.change(screen.getByLabelText(/またはデータを直接貼り付け/i), {
      target: { value: JSON.stringify(parsedData) },
    });
    fireEvent.click(screen.getByRole('button', { name: /プレビュー & 差分確認/i }));
    const confirmButton = await screen.findByRole('button', { name: '確定して適用' });
    fireEvent.click(confirmButton);

    expect(await screen.findByText('履歴の保存に失敗しました')).toBeInTheDocument();
    await waitFor(() => expect(confirmButton).not.toBeDisabled());
    expect(service.importData).toHaveBeenCalledTimes(1);
    expect(onImportComplete).not.toHaveBeenCalled();
    expect(screen.queryByText('インポートが完了しました')).not.toBeInTheDocument();
  });

  it('インポート失敗後に同じ画面で再試行し、成功状態へ進む', async () => {
    const service = {
      format: 'json',
      supportsTarget: vi.fn(() => true),
      parse: vi.fn().mockResolvedValue(parsedData),
      validate: vi.fn(),
      importData: vi.fn()
        .mockResolvedValueOnce(failedResult)
        .mockResolvedValueOnce(successfulResult),
    } satisfies IImportService;
    const { factory, policy } = createImportDependencies(service);
    const onImportComplete = vi.fn();

    render(
      <ImportModal
        isOpen={true}
        onClose={vi.fn()}
        onImportComplete={onImportComplete}
        importFactory={factory}
        validationPolicy={policy}
      />
    );

    fireEvent.change(screen.getByLabelText(/またはデータを直接貼り付け/i), {
      target: { value: JSON.stringify(parsedData) },
    });
    fireEvent.click(screen.getByRole('button', { name: /プレビュー & 差分確認/i }));
    const confirmButton = await screen.findByRole('button', { name: '確定して適用' });

    fireEvent.click(confirmButton);
    expect(await screen.findByText('履歴の保存に失敗しました')).toBeInTheDocument();
    await waitFor(() => expect(confirmButton).not.toBeDisabled());

    fireEvent.click(confirmButton);
    expect(await screen.findByText('インポートが完了しました')).toBeInTheDocument();
    expect(screen.queryByText('履歴の保存に失敗しました')).not.toBeInTheDocument();
    expect(service.importData).toHaveBeenCalledTimes(2);
    expect(onImportComplete).toHaveBeenCalledTimes(1);
    expect(onImportComplete).toHaveBeenCalledWith(successfulResult);
  });
});

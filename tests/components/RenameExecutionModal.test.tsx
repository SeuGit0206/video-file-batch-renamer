// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RenameExecutionModal } from '../../src/components/rename/RenameExecutionModal';
import { RenameExecutionService } from '../../src/services/rename/RenameExecutionService';
import { RenameTransaction } from '../../src/services/rename/RenameTransaction';
import { RenameUndoRedoManager } from '../../src/services/rename/RenameUndoRedoManager';
import type { VideoFile } from '../../src/types';

describe('RenameExecutionModal Component Suite', () => {
  const mockFiles: VideoFile[] = [
    {
      id: 'f1',
      originalName: 'SSNI-001 [1080p].mp4',
      extractedId: 'SSNI-001',
      status: 'completed',
      metadata: {
        productId: 'SSNI-001',
        title: '新人NO.1 STYLE',
        actress: '三上悠亜',
      },
    },
  ];

  const getFormattedName = (f: VideoFile) => `[2026] ${f.extractedId} ${f.metadata?.title || ''}.mp4`;
  const executionService = new RenameExecutionService();
  const renameTransaction = new RenameTransaction(executionService);
  const undoRedoManager = new RenameUndoRedoManager();
  const onApplyRenameToFiles = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
      writable: true,
      configurable: true,
    });
  });

  it('renders modal with script export buttons and clipboard buttons', () => {
    render(
      <RenameExecutionModal
        isOpen={true}
        onClose={onClose}
        files={mockFiles}
        getFormattedName={getFormattedName}
        renameTransaction={renameTransaction}
        undoRedoManager={undoRedoManager}
        onApplyRenameToFiles={onApplyRenameToFiles}
      />
    );

    expect(screen.getByText('実ファイルリネーム実行エンジン')).toBeTruthy();
    expect(screen.getByText('PS コピー')).toBeTruthy();
    expect(screen.getByText('BAT コピー')).toBeTruthy();
    expect(screen.getByText('PowerShell (.ps1) 出力')).toBeTruthy();
    expect(screen.getByText('バッチ (.bat) 出力')).toBeTruthy();
  });

  it('copies PowerShell script to clipboard and shows feedback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(
      <RenameExecutionModal
        isOpen={true}
        onClose={onClose}
        files={mockFiles}
        getFormattedName={getFormattedName}
        renameTransaction={renameTransaction}
        undoRedoManager={undoRedoManager}
        onApplyRenameToFiles={onApplyRenameToFiles}
      />
    );

    const copyPsBtn = screen.getByRole('button', { name: /PS コピー/i });
    fireEvent.click(copyPsBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
      expect(screen.getByText(/PowerShell スクリプトをクリップボードにコピーしました/i)).toBeTruthy();
    });
  });

  it('copies Batch script to clipboard and shows feedback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(
      <RenameExecutionModal
        isOpen={true}
        onClose={onClose}
        files={mockFiles}
        getFormattedName={getFormattedName}
        renameTransaction={renameTransaction}
        undoRedoManager={undoRedoManager}
        onApplyRenameToFiles={onApplyRenameToFiles}
      />
    );

    const copyBatBtn = screen.getByRole('button', { name: /BAT コピー/i });
    fireEvent.click(copyBatBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
      expect(screen.getByText(/バッチスクリプトをクリップボードにコピーしました/i)).toBeTruthy();
    });
  });

  const partialFailureFiles: VideoFile[] = [
    {
      id: 'success-file',
      originalName: '成功前.mp4',
      status: 'completed',
    },
    {
      id: 'failed-file',
      originalName: '失敗前.mp4',
      status: 'completed',
    },
  ];

  const partialFailureFormattedName = (file: VideoFile) =>
    file.id === 'success-file' ? '成功後.mp4' : '使用不可:名前.mp4';

  function renderPartialFailureScenario() {
    const manager = new RenameUndoRedoManager();
    const transaction = new RenameTransaction(new RenameExecutionService());
    const applyRename = vi.fn();

    render(
      <RenameExecutionModal
        isOpen={true}
        onClose={vi.fn()}
        files={partialFailureFiles}
        getFormattedName={partialFailureFormattedName}
        renameTransaction={transaction}
        undoRedoManager={manager}
        onApplyRenameToFiles={applyRename}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '実ファイルリネーム一括実行' }));
    return { applyRename };
  }

  it('部分失敗では成功したファイルだけを更新し、成功件数と失敗件数を表示する', () => {
    const { applyRename } = renderPartialFailureScenario();

    expect(screen.getByText('一部完了: 成功 1件 / 失敗 1件')).toBeTruthy();
    expect(screen.getByText('成功')).toBeTruthy();
    expect(screen.getByText('失敗')).toBeTruthy();
    expect(screen.getByText(/ファイル名に使用できない文字が含まれています/)).toBeTruthy();
    expect(applyRename).toHaveBeenCalledTimes(1);
    expect(applyRename).toHaveBeenLastCalledWith([
      expect.objectContaining({
        id: 'success-file',
        originalName: '成功後.mp4',
        newName: '成功後.mp4',
        status: 'completed',
      }),
      partialFailureFiles[1],
    ]);
  });

  it('部分成功をUndoすると成功したファイルだけを元へ戻す', () => {
    const { applyRename } = renderPartialFailureScenario();

    fireEvent.click(screen.getAllByRole('button', { name: 'Undo (1)' })[0]);

    expect(screen.getByText('Undo (元に戻す) を実行しました')).toBeTruthy();
    expect(applyRename).toHaveBeenCalledTimes(2);
    expect(applyRename).toHaveBeenLastCalledWith([
      expect.objectContaining({
        id: 'success-file',
        originalName: '成功前.mp4',
        status: 'pending',
      }),
      partialFailureFiles[1],
    ]);
    expect(screen.getAllByRole('button', { name: 'Undo (0)' }).every((button) => button.hasAttribute('disabled'))).toBe(true);
    expect(screen.getAllByRole('button', { name: 'Redo (1)' }).every((button) => !button.hasAttribute('disabled'))).toBe(true);
  });

  it('Undo後のRedoでは成功分だけを再反映し、履歴件数を更新する', () => {
    const { applyRename } = renderPartialFailureScenario();

    fireEvent.click(screen.getAllByRole('button', { name: 'Undo (1)' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Redo (1)' })[0]);

    expect(screen.getByText('Redo (やり直し) を実行しました')).toBeTruthy();
    expect(applyRename).toHaveBeenCalledTimes(3);
    expect(applyRename).toHaveBeenLastCalledWith([
      expect.objectContaining({
        id: 'success-file',
        originalName: '成功後.mp4',
        status: 'completed',
      }),
      partialFailureFiles[1],
    ]);
    expect(screen.getAllByRole('button', { name: 'Undo (1)' }).every((button) => !button.hasAttribute('disabled'))).toBe(true);
    expect(screen.getAllByRole('button', { name: 'Redo (0)' }).every((button) => button.hasAttribute('disabled'))).toBe(true);
  });
});

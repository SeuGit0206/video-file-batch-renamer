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
});

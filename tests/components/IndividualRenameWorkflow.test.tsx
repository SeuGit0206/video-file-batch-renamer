// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { VideoFile } from '../../src/types';
import { RenameTransaction } from '../../src/services/rename/RenameTransaction';
import { generatePowerShellRenameScript } from '../../src/utils/scriptExporter';

const captured = vi.hoisted(() => ({ renameModalProps: undefined as unknown }));

vi.mock('../../src/components/rename/RenameExecutionModal', () => ({
  RenameExecutionModal: (props: unknown) => {
    captured.renameModalProps = props;
    return null;
  },
}));

import App from '../../src/App';

type RenameModalData = {
  files: VideoFile[];
  getFormattedName: (file: VideoFile) => string;
};

const response = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;

function rowFor(name: string) {
  const row = screen.getAllByText(name).map(element => element.closest('tr')).find(Boolean);
  if (!row) throw new Error(`ファイル行が見つかりません: ${name}`);
  return within(row);
}

describe('App 個別リネーム予定名の確認', () => {
  beforeEach(() => {
    localStorage.clear();
    captured.renameModalProps = undefined;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('実ファイルの元名を保持し、予定名を後続スクリプトの変更先として渡す', async () => {
    const executeTransaction = vi.spyOn(RenameTransaction.prototype, 'executeTransaction');
    vi.stubGlobal('fetch', (url: string) => {
      if (url.startsWith('/api/metadata?')) return Promise.resolve(response({ data: { title: '作品名' } }));
      if (url === '/api/version') return Promise.resolve(response({ version: '1.14.2' }));
      if (url === '/api/cache/stats') return Promise.resolve(response({ count: 0, maxEntries: 500, defaultTtlMs: 86400000, sizeBytes: 0 }));
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<App />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { files: [new File(['video'], 'ABC-123.mp4', { type: 'video/mp4' })] } });
    fireEvent.click(screen.getByRole('button', { name: /^作品ID抽出$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^メタデータ取得$/ }));
    await screen.findByText('メタデータ同期が完了しました (1 / 1 件)');

    const before = captured.renameModalProps as RenameModalData;
    expect(before.files[0].originalName).toBe('ABC-123.mp4');
    expect(before.getFormattedName(before.files[0])).toBe('作品名.mp4');

    fireEvent.click(rowFor('ABC-123.mp4').getByTitle('個別リネーム予定名を確認'));
    await screen.findByText('変更予定名: ABC-123.mp4 → 作品名.mp4（実ファイルは未変更）');

    const after = captured.renameModalProps as RenameModalData;
    expect(rowFor('ABC-123.mp4').getAllByText('作品名.mp4').length).toBeGreaterThan(0);
    expect(executeTransaction).not.toHaveBeenCalled();
    expect(after.files[0].originalName).toBe('ABC-123.mp4');
    expect(after.getFormattedName(after.files[0])).toBe('作品名.mp4');

    const currentScript = generatePowerShellRenameScript(after.files, after.getFormattedName);
    expect(currentScript).toContain("Test-Path -LiteralPath 'ABC-123.mp4'");
    expect(currentScript).toContain("Rename-Item -LiteralPath 'ABC-123.mp4' -NewName '作品名.mp4'");
    expect(currentScript).not.toContain('リネーム対象のファイルがありません');

    fireEvent.click(screen.getByRole('button', { name: /^リネーム実行$/ }));
    expect((captured.renameModalProps as RenameModalData & { isOpen: boolean }).isOpen).toBe(true);
    expect((captured.renameModalProps as RenameModalData).files[0].originalName).toBe('ABC-123.mp4');
  });
});

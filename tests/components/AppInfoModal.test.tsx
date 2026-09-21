// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppInfoModal } from '../../src/components/AppInfoModal';

describe('AppInfoModal 設定インポート表示', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const importFile = (content: string) => {
    fireEvent.click(screen.getByRole('button', { name: '設定バックアップ / 復元' }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File([content], 'settings.json', { type: 'application/json' })] },
    });
  };

  it('有効項目がない設定は成功表示せず既存の失敗表示を出す', async () => {
    const onImportConfig = vi.fn(() => false);
    render(
      <AppInfoModal
        isOpen
        onClose={vi.fn()}
        onImportConfig={onImportConfig}
      />
    );

    importFile('{}');

    expect(await screen.findByText('設定形式が不適切です。インポートに失敗しました。')).toBeTruthy();
    expect(screen.queryByText('設定を正常にインポートしました。')).toBeNull();
    expect(onImportConfig).toHaveBeenCalledWith('{}');
  });

  it('有効な設定は従来どおり成功表示を出す', async () => {
    const onImportConfig = vi.fn(() => true);
    render(
      <AppInfoModal
        isOpen
        onClose={vi.fn()}
        onImportConfig={onImportConfig}
      />
    );

    importFile('{"settings":{"renameTemplate":"{title}"}}');

    expect(await screen.findByText('設定を正常にインポートしました。')).toBeTruthy();
    expect(screen.queryByText('設定形式が不適切です。インポートに失敗しました。')).toBeNull();
  });
});

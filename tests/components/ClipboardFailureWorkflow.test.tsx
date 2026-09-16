// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/App';

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function mockClipboardWrite(result: 'resolve' | 'reject') {
  const writeText = vi.fn((_text: string) => result === 'resolve'
    ? Promise.resolve()
    : Promise.reject(new Error('Clipboard write failed')));
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  return writeText;
}

describe('Clipboard書き込み失敗時の現在の表示', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    } else {
      delete (navigator as { clipboard?: Clipboard }).clipboard;
    }
  });

  it('Appのファイル内容コピーは失敗時に成功表示せず失敗を伝える', async () => {
    const writeText = mockClipboardWrite('reject');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'C# 実装コード規約' }));
    fireEvent.click(screen.getByRole('button', { name: /^コピー$/ }));

    expect(writeText).toHaveBeenCalledTimes(1);
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: 'コピー完了' })).toBeNull();
    expect(screen.getByText('ファイル内容のクリップボードコピーに失敗しました。')).toBeTruthy();
  });

  it('ログコピーは失敗時に成功表示・成功ログを残さず失敗を伝える', async () => {
    const writeText = mockClipboardWrite('reject');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '📋 ログをコピー' }));

    expect(writeText).toHaveBeenCalledTimes(1);
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: 'コピー完了' })).toBeNull();
    expect(screen.queryByText('ログをクリップボードにコピーしました。')).toBeNull();
    expect(screen.getByRole('alert').textContent).toBe('ログのクリップボードコピーに失敗しました。');
  });

  it('AppInfoModalの診断情報コピーは失敗時に成功表示せず失敗を伝える', async () => {
    const writeText = mockClipboardWrite('reject');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'アプリ情報' }));
    fireEvent.click(screen.getByRole('button', { name: 'システム診断 & ログ' }));
    fireEvent.click(screen.getByRole('button', { name: '診断情報をクリップボードにコピー' }));

    expect(writeText).toHaveBeenCalledTimes(1);
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: 'コピー完了' })).toBeNull();
    expect(screen.getByText('診断情報のクリップボードコピーに失敗しました。')).toBeTruthy();
  });

  it.each([
    ['ファイル内容', async () => {
      fireEvent.click(screen.getByRole('button', { name: 'C# 実装コード規約' }));
      fireEvent.click(screen.getByRole('button', { name: /^コピー$/ }));
      await screen.findByRole('button', { name: 'コピー完了' });
    }],
    ['ログ', async () => {
      fireEvent.click(screen.getByRole('button', { name: '📋 ログをコピー' }));
      await screen.findByRole('button', { name: 'コピー完了' });
      expect(screen.getByText('ログをクリップボードにコピーしました。')).toBeTruthy();
    }],
    ['診断情報', async () => {
      fireEvent.click(screen.getByRole('button', { name: 'アプリ情報' }));
      fireEvent.click(screen.getByRole('button', { name: 'システム診断 & ログ' }));
      fireEvent.click(screen.getByRole('button', { name: '診断情報をクリップボードにコピー' }));
      await screen.findByRole('button', { name: 'コピー完了' });
    }],
  ] as const)('%sコピーはwriteText成功後に成功表示する', async (_name, operate) => {
    const writeText = mockClipboardWrite('resolve');
    render(<App />);
    await operate();

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

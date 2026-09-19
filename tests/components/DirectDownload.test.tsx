// @vitest-environment jsdom
import React from 'react';
import JSZip from 'jszip';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../../src/App';

describe('App direct ZIP and log downloads', () => {
  const create = vi.fn();
  const revoke = vi.fn();
  let clicked: { href: string; filename: string }[];

  beforeEach(() => {
    vi.useFakeTimers();
    clicked = [];
    create.mockReset().mockReturnValue('blob:app-download');
    revoke.mockReset();
    class MockURL extends URL {
      static createObjectURL = create;
      static revokeObjectURL = revoke;
    }
    vi.stubGlobal('URL', MockURL);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      clicked.push({ href: this.href, filename: this.download });
      expect(revoke).not.toHaveBeenCalled();
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('downloads the generated ZIP with the existing filename and releases its URL', async () => {
    const blob = new Blob(['zip payload'], { type: 'application/zip' });
    const generate = vi.spyOn(JSZip.prototype, 'generateAsync').mockResolvedValue(blob);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'C# 実装コード規約' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'WPFプロジェクト一括ダウンロード (ZIP)' }));
    });
    expect(generate).toHaveBeenCalledExactlyOnceWith({ type: 'blob' });
    expect(create).toHaveBeenCalledExactlyOnceWith(blob);
    expect(clicked).toEqual([{ href: 'blob:app-download', filename: 'VideoRenamer_Csharp_Project.zip' }]);
    expect(revoke).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(40_000));
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:app-download');
  });

  it('downloads logs with the existing filename and Blob type and releases the URL', async () => {
    const now = Date.now();
    render(<App />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '💾 ログ保存' }));
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(create.mock.calls[0][0].type).toBe('text/plain;charset=utf-8;');
    expect(clicked).toEqual([{ href: 'blob:app-download', filename: `app_logs_${now}.log` }]);
    expect(revoke).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(40_000));
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:app-download');
  });
});

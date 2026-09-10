// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { SettingsPanel } from '../../src/components/SettingsPanel';

describe('SettingsPanel Component', () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = global.fetch;
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url === '/api/cache/stats') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ count: 12, maxEntries: 500, defaultTtlMs: 86400000, sizeBytes: 131480 }),
        });
      }
      if (url === '/api/cache' && options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    expect(global.fetch).toBe(originalFetch);
  });

  it('renders template, regex inputs and handles settings updates', async () => {
    const setRenameTemplate = vi.fn();
    const setRegexPattern = vi.fn();
    const setSkipDuplicates = vi.fn();
    const setUseCache = vi.fn();
    const setShowBrowser = vi.fn();
    const setCookiePath = vi.fn();
    const setCacheSavePath = vi.fn();
    const setLogRetentionDays = vi.fn();
    const setMaxConcurrency = vi.fn();
    const setAccessDelayMs = vi.fn();
    const addLog = vi.fn();

    render(
      <SettingsPanel
        renameTemplate="{id}_{title}"
        setRenameTemplate={setRenameTemplate}
        regexPattern="(?i)\b([a-z]{2,6})-([0-9]{3,5})\b"
        setRegexPattern={setRegexPattern}
        skipDuplicates={true}
        setSkipDuplicates={setSkipDuplicates}
        useCache={true}
        setUseCache={setUseCache}
        showBrowser={false}
        setShowBrowser={setShowBrowser}
        cookiePath="AppData/cookies.json"
        setCookiePath={setCookiePath}
        cacheSavePath="AppData/cache.db"
        setCacheSavePath={setCacheSavePath}
        logRetentionDays={30}
        setLogRetentionDays={setLogRetentionDays}
        maxConcurrency={3}
        setMaxConcurrency={setMaxConcurrency}
        accessDelayMs={1000}
        setAccessDelayMs={setAccessDelayMs}
        addLog={addLog}
      />
    );

    expect(screen.getByText('WPF MVVM バインディング設定')).toBeTruthy();

    const templateInput = screen.getByDisplayValue('{id}_{title}') as HTMLInputElement;
    fireEvent.change(templateInput, { target: { value: '{actress}/{id}' } });
    expect(setRenameTemplate).toHaveBeenCalled();

    const regexStandardBtn = screen.getByText('標準 (ABC-123)');
    fireEvent.click(regexStandardBtn);
    expect(setRegexPattern).toHaveBeenCalledWith(String.raw`(?i)\b([a-z]{2,6})-([0-9]{3,5})\b`);

    await waitFor(() => {
      expect(screen.getByText('約 128.4 KB')).toBeTruthy();
    });
  });

  it.each([
    [undefined, '0 B'], [0, '0 B'], [-100, '0 B'], [500, '約 500 B'],
    [1024, '約 1.0 KB'], [131480, '約 128.4 KB'], [2.5 * 1024 * 1024, '約 2.5 MB'],
  ])('renders %s bytes as %s and clears the cache', async (sizeBytes, expectedText) => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 12, maxEntries: 500, defaultTtlMs: 86400000, sizeBytes }),
    } as Response);
    const onClearClientCache = vi.fn();
    const addLog = vi.fn();

    render(
      <SettingsPanel
        renameTemplate="{id}_{title}"
        setRenameTemplate={vi.fn()}
        regexPattern=""
        setRegexPattern={vi.fn()}
        skipDuplicates={true}
        setSkipDuplicates={vi.fn()}
        useCache={true}
        setUseCache={vi.fn()}
        showBrowser={false}
        setShowBrowser={vi.fn()}
        cookiePath="AppData/cookies.json"
        setCookiePath={vi.fn()}
        cacheSavePath="AppData/cache.db"
        setCacheSavePath={vi.fn()}
        logRetentionDays={30}
        setLogRetentionDays={vi.fn()}
        maxConcurrency={2}
        setMaxConcurrency={vi.fn()}
        accessDelayMs={500}
        setAccessDelayMs={vi.fn()}
        addLog={addLog}
        onClearClientCache={onClearClientCache}
      />
    );

    expect(screen.getByText('キャッシュ管理・統計')).toBeTruthy();
    expect(screen.getByText('キャッシュ全消去')).toBeTruthy();

    // Wait microtask for stats to load
    await waitFor(() => {
      expect(screen.getByText('キャッシュファイル容量:')).toBeTruthy();
      expect(screen.getByText(expectedText)).toBeTruthy();
    });

    // Click "キャッシュ全消去" to show confirmation dialog
    fireEvent.click(screen.getByText('キャッシュ全消去'));
    expect(screen.getByText('キャッシュ全消去の確認')).toBeTruthy();

    // Confirm clearing
    const confirmBtn = screen.getByText('全消去する');
    fireEvent.click(confirmBtn);

    // Wait for async clear and reload
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cache', { method: 'DELETE' });
      expect(onClearClientCache).toHaveBeenCalled();
      expect(addLog).toHaveBeenCalledWith('Info', 'CacheManager', expect.stringContaining('メタデータキャッシュを完全にクリアしました'));
      expect(screen.getByText('キャッシュを全消去しました。')).toBeTruthy();
    });
  });
});

// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from '../../src/components/SettingsPanel';

describe('SettingsPanel Component', () => {
  it('renders template, regex inputs and handles settings updates', () => {
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
    expect(setRegexPattern).toHaveBeenCalledWith('(?i)\\b([a-z]{2,6})-([0-9]{3,5})\\b');
  });
});

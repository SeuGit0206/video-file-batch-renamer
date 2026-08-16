// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { useAppSettings } from '../../../hooks/useAppSettings';

describe('useAppSettings Hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('初期デフォルト値が正しく設定され、localStorageから復元される', () => {
    localStorage.setItem('cfg_cookie_path', 'custom/cookies.json');
    localStorage.setItem('cfg_log_days', '60');
    localStorage.setItem('cfg_max_concurrency', '4');
    localStorage.setItem('cfg_delay_ms', '2000');
    localStorage.setItem('cfg_cache_path', 'custom/cache.db');
    localStorage.setItem('cfg_show_browser', 'true');

    const { result } = renderHook(() => useAppSettings());

    expect(result.current.renameTemplate).toBe('{title}');
    expect(result.current.cookiePath).toBe('custom/cookies.json');
    expect(result.current.logRetentionDays).toBe(60);
    expect(result.current.maxConcurrency).toBe(4);
    expect(result.current.accessDelayMs).toBe(2000);
    expect(result.current.cacheSavePath).toBe('custom/cache.db');
    expect(result.current.showBrowser).toBe(true);
  });

  it('設定値の変更時に localStorage が自動同期される', () => {
    const { result } = renderHook(() => useAppSettings());

    act(() => {
      result.current.setCookiePath('new/cookie/path.json');
      result.current.setMaxConcurrency(8);
      result.current.setShowBrowser(true);
    });

    expect(localStorage.getItem('cfg_cookie_path')).toBe('new/cookie/path.json');
    expect(localStorage.getItem('cfg_max_concurrency')).toBe('8');
    expect(localStorage.getItem('cfg_show_browser')).toBe('true');
  });

  it('handleExportAppConfig で現在の設定・ルールをJSON形式でエクスポートできる', () => {
    const { result } = renderHook(() => useAppSettings());

    act(() => {
      result.current.setRenameTemplate('{date}_{title}');
      result.current.setRuleEnabled(true);
    });

    const exportedJson = result.current.handleExportAppConfig();
    const parsed = JSON.parse(exportedJson);

    expect(parsed.settings.renameTemplate).toBe('{date}_{title}');
    expect(parsed.ruleEnabled).toBe(true);
    expect(parsed.version).toBeDefined();
    expect(parsed.exportedAt).toBeDefined();
  });

  it('handleImportAppConfig でJSON設定を安全に復元・反映できる', () => {
    const { result } = renderHook(() => useAppSettings());

    const importJson = JSON.stringify({
      settings: {
        renameTemplate: '{actress} - {title}',
        regexPattern: '([A-Z]{3,4}-[0-9]{3})',
        skipDuplicates: false,
        useCache: false,
        cookiePath: 'imported/cookies.json',
        logRetentionDays: 90,
        maxConcurrency: 2,
        accessDelayMs: 3000,
        cacheSavePath: 'imported/cache.db',
        showBrowser: true,
      },
      rules: [
        {
          id: 'rule_1',
          name: 'Test Rule',
          target: 'title',
          condition: { operator: 'contains', value: 'Sample' },
          action: { type: 'replace', value: '' },
          enabled: true,
          order: 1,
        }
      ],
      ruleEnabled: true,
    });

    let success = false;
    act(() => {
      success = result.current.handleImportAppConfig(importJson);
    });

    expect(success).toBe(true);
    expect(result.current.renameTemplate).toBe('{actress} - {title}');
    expect(result.current.regexPattern).toBe('([A-Z]{3,4}-[0-9]{3})');
    expect(result.current.skipDuplicates).toBe(false);
    expect(result.current.useCache).toBe(false);
    expect(result.current.cookiePath).toBe('imported/cookies.json');
    expect(result.current.logRetentionDays).toBe(90);
    expect(result.current.maxConcurrency).toBe(2);
    expect(result.current.accessDelayMs).toBe(3000);
    expect(result.current.cacheSavePath).toBe('imported/cache.db');
    expect(result.current.showBrowser).toBe(true);
    expect(result.current.rules.length).toBe(1);
    expect(result.current.ruleEnabled).toBe(true);
  });

  it('無効なJSONをインポートした場合に false を返して安全に終了する', () => {
    const { result } = renderHook(() => useAppSettings());

    let success = true;
    act(() => {
      success = result.current.handleImportAppConfig('invalid-json');
    });

    expect(success).toBe(false);
  });
});

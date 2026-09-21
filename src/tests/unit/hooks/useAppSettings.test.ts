// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppSettings } from '../../../hooks/useAppSettings';

describe('useAppSettings Hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('初期デフォルト値が正しく設定され、localStorageから復元される', () => {
    localStorage.setItem('cfg_cookie_path', 'custom/cookies.json');
    localStorage.setItem('cfg_log_days', '60');
    localStorage.setItem('cfg_max_concurrency', '3');
    localStorage.setItem('cfg_delay_ms', '2000');
    localStorage.setItem('cfg_cache_path', 'custom/cache.db');
    localStorage.setItem('cfg_show_browser', 'true');

    const { result } = renderHook(() => useAppSettings());

    expect(result.current.renameTemplate).toBe('{title}');
    expect(result.current.cookiePath).toBe('custom/cookies.json');
    expect(result.current.logRetentionDays).toBe(60);
    expect(result.current.maxConcurrency).toBe(3);
    expect(result.current.accessDelayMs).toBe(2000);
    expect(result.current.cacheSavePath).toBe('custom/cache.db');
    expect(result.current.showBrowser).toBe(true);
  });

  it('設定値の変更時に localStorage が自動同期され、maxConcurrency が安全にクランプされる', () => {
    const { result } = renderHook(() => useAppSettings());

    act(() => {
      result.current.setCookiePath('new/cookie/path.json');
      result.current.setMaxConcurrency(8); // 上限超過値は 3 にクランプ
      result.current.setShowBrowser(true);
    });

    expect(localStorage.getItem('cfg_cookie_path')).toBe('new/cookie/path.json');
    expect(localStorage.getItem('cfg_max_concurrency')).toBe('3');
    expect(result.current.maxConcurrency).toBe(3);
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

  it.each([
    ['NaN相当なら既定値', 'not-a-number', 2],
    ['下限未満なら下限', '0', 1],
    ['上限超過なら上限', '9', 3],
  ])('保存済み同時実行数が%sへ安全に補正される', (_caseName, stored, expected) => {
    localStorage.setItem('cfg_max_concurrency', stored);

    const { result } = renderHook(() => useAppSettings());

    expect(result.current.maxConcurrency).toBe(expected);
    expect(Number.isNaN(result.current.maxConcurrency)).toBe(false);
  });

  it('localStorageの読み込み失敗時も既定設定で初期化できる', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('ストレージを読み込めません', 'SecurityError');
    });

    const { result } = renderHook(() => useAppSettings());

    expect(result.current.cookiePath).toBe('logs/cookies.json');
    expect(result.current.logRetentionDays).toBe(30);
    expect(result.current.maxConcurrency).toBe(2);
    expect(result.current.accessDelayMs).toBe(1500);
    expect(result.current.cacheSavePath).toBe('logs/cache.db');
    expect(result.current.showBrowser).toBe(false);
  });

  it('localStorageの保存失敗時も現在の設定状態を維持する', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('ストレージへ保存できません', 'QuotaExceededError');
    });

    const { result } = renderHook(() => useAppSettings());

    act(() => {
      result.current.setCookiePath('memory-only/cookies.json');
      result.current.setMaxConcurrency(3);
      result.current.setShowBrowser(true);
    });

    expect(result.current.cookiePath).toBe('memory-only/cookies.json');
    expect(result.current.maxConcurrency).toBe(3);
    expect(result.current.showBrowser).toBe(true);
  });

  it('無効なJSONをインポートした場合に false を返して現在の設定を維持する', () => {
    const { result } = renderHook(() => useAppSettings());

    act(() => {
      result.current.setRenameTemplate('{productId}_{title}');
      result.current.setRuleEnabled(true);
    });

    let success = true;
    act(() => {
      success = result.current.handleImportAppConfig('invalid-json');
    });

    expect(success).toBe(false);
    expect(result.current.renameTemplate).toBe('{productId}_{title}');
    expect(result.current.ruleEnabled).toBe(true);
  });

  it.each([
    ['空のオブジェクト', {}],
    ['空のsettings', { settings: {} }],
  ])('%sは有効項目がないため false を返す', (_caseName, imported) => {
    const { result } = renderHook(() => useAppSettings());

    let success = true;
    act(() => {
      success = result.current.handleImportAppConfig(JSON.stringify(imported));
    });

    expect(success).toBe(false);
  });

  it('全項目が無効なら false を返し、既存設定を維持する', () => {
    const { result } = renderHook(() => useAppSettings());

    act(() => {
      result.current.setRenameTemplate('{productId}_{title}');
      result.current.setMaxConcurrency(3);
      result.current.setRules([]);
      result.current.setRuleEnabled(true);
    });

    let success = false;
    act(() => {
      success = result.current.handleImportAppConfig(JSON.stringify({
        settings: {
          renameTemplate: 123,
          maxConcurrency: 'not-a-number',
          showBrowser: 'true',
        },
        rules: { id: 'not-an-array' },
        ruleEnabled: 'false',
      }));
    });

    expect(success).toBe(false);
    expect(result.current.renameTemplate).toBe('{productId}_{title}');
    expect(result.current.maxConcurrency).toBe(3);
    expect(result.current.showBrowser).toBe(false);
    expect(result.current.rules).toEqual([]);
    expect(result.current.ruleEnabled).toBe(true);
  });

  it('有効項目と無効項目が混在する場合は有効項目だけを反映して true を返す', () => {
    const { result } = renderHook(() => useAppSettings());

    act(() => {
      result.current.setRenameTemplate('{productId}_{title}');
      result.current.setMaxConcurrency(3);
    });

    let success = false;
    act(() => {
      success = result.current.handleImportAppConfig(JSON.stringify({
        settings: {
          renameTemplate: '{date}_{title}',
          maxConcurrency: 'not-a-number',
        },
      }));
    });

    expect(success).toBe(true);
    expect(result.current.renameTemplate).toBe('{date}_{title}');
    expect(result.current.maxConcurrency).toBe(3);
  });

  it.each([
    ['rules', { rules: [] }],
    ['ruleEnabled', { ruleEnabled: false }],
  ])('%sだけが有効な場合も true を返す', (_caseName, imported) => {
    const { result } = renderHook(() => useAppSettings());

    let success = false;
    act(() => {
      success = result.current.handleImportAppConfig(JSON.stringify(imported));
    });

    expect(success).toBe(true);
  });
});

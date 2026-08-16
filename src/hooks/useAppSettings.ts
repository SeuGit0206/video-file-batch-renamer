import { useState, useEffect, useCallback } from 'react';
import type { RuleDefinition } from '../types/rule';
import { APP_VERSION_TAG } from '../constants';

export interface AppSettingsState {
  renameTemplate: string;
  regexPattern: string;
  skipDuplicates: boolean;
  useCache: boolean;
  showBrowser: boolean;
  cookiePath: string;
  cacheSavePath: string;
  logRetentionDays: number;
  maxConcurrency: number;
  accessDelayMs: number;
  rules: RuleDefinition[];
  ruleEnabled: boolean;
}

export function useAppSettings() {
  // Core Renamer Settings
  const [renameTemplate, setRenameTemplate] = useState<string>('{title}');
  const [regexPattern, setRegexPattern] = useState<string>('(?i)\\b([a-z]{2,6})-([0-9]{3,5})\\b');
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);
  const [useCache, setUseCache] = useState<boolean>(true);

  // Dynamic Rule Settings
  const [rules, setRules] = useState<RuleDefinition[]>([]);
  const [ruleEnabled, setRuleEnabled] = useState<boolean>(false);

  // Persistence Settings with localStorage defaults
  const [cookiePath, setCookiePath] = useState<string>(() => {
    try {
      return (typeof window !== 'undefined' && localStorage.getItem('cfg_cookie_path')) || 'logs/cookies.json';
    } catch {
      return 'logs/cookies.json';
    }
  });

  const [logRetentionDays, setLogRetentionDays] = useState<number>(() => {
    try {
      return Number((typeof window !== 'undefined' && localStorage.getItem('cfg_log_days')) || '30');
    } catch {
      return 30;
    }
  });

  const [maxConcurrency, setMaxConcurrency] = useState<number>(() => {
    try {
      return Number((typeof window !== 'undefined' && localStorage.getItem('cfg_max_concurrency')) || '1');
    } catch {
      return 1;
    }
  });

  const [accessDelayMs, setAccessDelayMs] = useState<number>(() => {
    try {
      return Number((typeof window !== 'undefined' && localStorage.getItem('cfg_delay_ms')) || '1500');
    } catch {
      return 1500;
    }
  });

  const [cacheSavePath, setCacheSavePath] = useState<string>(() => {
    try {
      return (typeof window !== 'undefined' && localStorage.getItem('cfg_cache_path')) || 'logs/cache.db';
    } catch {
      return 'logs/cache.db';
    }
  });

  const [showBrowser, setShowBrowser] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('cfg_show_browser') === 'true';
    } catch {
      return false;
    }
  });

  // Save config settings to localStorage on change
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('cfg_cookie_path', cookiePath);
        localStorage.setItem('cfg_log_days', String(logRetentionDays));
        localStorage.setItem('cfg_max_concurrency', String(maxConcurrency));
        localStorage.setItem('cfg_delay_ms', String(accessDelayMs));
        localStorage.setItem('cfg_cache_path', cacheSavePath);
        localStorage.setItem('cfg_show_browser', String(showBrowser));
      }
    } catch {
      // ignore storage errors
    }
  }, [cookiePath, logRetentionDays, maxConcurrency, accessDelayMs, cacheSavePath, showBrowser]);

  const handleExportAppConfig = useCallback((): string => {
    return JSON.stringify(
      {
        version: APP_VERSION_TAG,
        exportedAt: new Date().toISOString(),
        settings: {
          renameTemplate,
          regexPattern,
          skipDuplicates,
          useCache,
          cookiePath,
          logRetentionDays,
          maxConcurrency,
          accessDelayMs,
          cacheSavePath,
          showBrowser,
        },
        rules,
        ruleEnabled,
      },
      null,
      2
    );
  }, [
    renameTemplate,
    regexPattern,
    skipDuplicates,
    useCache,
    cookiePath,
    logRetentionDays,
    maxConcurrency,
    accessDelayMs,
    cacheSavePath,
    showBrowser,
    rules,
    ruleEnabled,
  ]);

  const handleImportAppConfig = useCallback((configJson: string): boolean => {
    try {
      const parsed = JSON.parse(configJson);
      if (parsed && typeof parsed === 'object' && parsed.settings) {
        if (typeof parsed.settings.renameTemplate === 'string') setRenameTemplate(parsed.settings.renameTemplate);
        if (typeof parsed.settings.regexPattern === 'string') setRegexPattern(parsed.settings.regexPattern);
        if (typeof parsed.settings.skipDuplicates === 'boolean') setSkipDuplicates(parsed.settings.skipDuplicates);
        if (typeof parsed.settings.useCache === 'boolean') setUseCache(parsed.settings.useCache);
        if (typeof parsed.settings.cookiePath === 'string') setCookiePath(parsed.settings.cookiePath);
        if (typeof parsed.settings.logRetentionDays === 'number') setLogRetentionDays(parsed.settings.logRetentionDays);
        if (typeof parsed.settings.maxConcurrency === 'number') setMaxConcurrency(parsed.settings.maxConcurrency);
        if (typeof parsed.settings.accessDelayMs === 'number') setAccessDelayMs(parsed.settings.accessDelayMs);
        if (typeof parsed.settings.cacheSavePath === 'string') setCacheSavePath(parsed.settings.cacheSavePath);
        if (typeof parsed.settings.showBrowser === 'boolean') setShowBrowser(parsed.settings.showBrowser);
      }
      if (Array.isArray(parsed.rules)) {
        setRules(parsed.rules);
      }
      if (typeof parsed.ruleEnabled === 'boolean') {
        setRuleEnabled(parsed.ruleEnabled);
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    renameTemplate,
    setRenameTemplate,
    regexPattern,
    setRegexPattern,
    skipDuplicates,
    setSkipDuplicates,
    useCache,
    setUseCache,
    rules,
    setRules,
    ruleEnabled,
    setRuleEnabled,
    cookiePath,
    setCookiePath,
    logRetentionDays,
    setLogRetentionDays,
    maxConcurrency,
    setMaxConcurrency,
    accessDelayMs,
    setAccessDelayMs,
    cacheSavePath,
    setCacheSavePath,
    showBrowser,
    setShowBrowser,
    handleExportAppConfig,
    handleImportAppConfig,
  };
}

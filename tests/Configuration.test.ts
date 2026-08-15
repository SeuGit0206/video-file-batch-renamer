import { describe, it, expect, vi } from 'vitest';
import {
  EnvironmentProvider,
  ConfigValidator,
  ConfigurationValidationError,
  RuntimeConfigurationProvider,
  FeatureFlagService,
} from '../src/config';

describe('Configuration & Feature Flags Test Suite', () => {
  describe('EnvironmentProvider', () => {
    it('環境変数の文字列、数値、真偽値を正しくパース・取得できること', () => {
      const mockEnv = {
        APP_NAME: 'test-app',
        PORT: '8080',
        ENABLE_CACHE: 'true',
        INVALID_NUM: 'not_a_number',
      };

      const provider = new EnvironmentProvider(mockEnv);

      expect(provider.get('APP_NAME')).toBe('test-app');
      expect(provider.get('NON_EXISTENT', 'default')).toBe('default');

      expect(provider.getNumber('PORT')).toBe(8080);
      expect(provider.getNumber('INVALID_NUM', 3000)).toBe(3000);
      expect(provider.getNumber('MISSING_NUM', 5000)).toBe(5000);

      expect(provider.getBoolean('ENABLE_CACHE')).toBe(true);
      expect(provider.getBoolean('MISSING_BOOL', false)).toBe(false);
    });
  });

  describe('ConfigValidator', () => {
    it('不正な設定値に対して ConfigurationValidationError をスローすること', () => {
      const invalidConfig = {
        app: { name: '', version: '1.0.0', port: -1, env: 'dev' },
        scraping: { timeoutMs: 0, maxRetries: -1, enableStealth: true },
        cache: { enabled: true, ttlSeconds: 0 },
        resilience: { circuitBreakerThreshold: 0, rateLimitMax: 0, rateLimitWindowMs: 60000 },
      };

      expect(() => ConfigValidator.validate(invalidConfig)).toThrow(ConfigurationValidationError);
    });
  });

  describe('RuntimeConfigurationProvider', () => {
    it('動的設定変更（Hot Reload）と変更通知リスナーが正しく機能すること', () => {
      const provider = new RuntimeConfigurationProvider();

      const listener = vi.fn();
      const unsubscribe = provider.onConfigChange(listener);

      const updated = provider.updateConfig({
        scraping: { timeoutMs: 45000, maxRetries: 5, enableStealth: false },
      });

      expect(updated.scraping.timeoutMs).toBe(45000);
      expect(updated.scraping.maxRetries).toBe(5);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      provider.updateConfig({ cache: { enabled: false, ttlSeconds: 3600 } });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('FeatureFlagService', () => {
    it('フラグの評価・トグル・イベント通知が正しく動作すること', () => {
      const mockEnv = {
        ENABLE_CACHE: 'true',
        FEATURE_FLAGS: 'NEW_UI=true,EXPERIMENTAL_API=false',
      };

      const envProvider = new EnvironmentProvider(mockEnv);
      const flagService = new FeatureFlagService(envProvider);

      expect(flagService.isEnabled('ENABLE_CACHE')).toBe(true);
      expect(flagService.isEnabled('NEW_UI')).toBe(true);
      expect(flagService.isEnabled('EXPERIMENTAL_API')).toBe(false);

      const listener = vi.fn();
      flagService.onFlagChange(listener);

      const toggled = flagService.toggleFlag('EXPERIMENTAL_API');
      expect(toggled).toBe(true);
      expect(flagService.isEnabled('EXPERIMENTAL_API')).toBe(true);
      expect(listener).toHaveBeenCalledWith('EXPERIMENTAL_API', true);

      expect(flagService.getAllFlags()).toEqual(
        expect.objectContaining({
          ENABLE_CACHE: true,
          NEW_UI: true,
          EXPERIMENTAL_API: true,
        })
      );
    });
  });
});

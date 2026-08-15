import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Browser, BrowserContext } from 'playwright';
import { BrowserContextFactory } from '../src/factories/BrowserContextFactory';
import { BrowserSettingsProvider } from '../src/browser/BrowserSettingsProvider';

describe('BrowserContextFactory', () => {
  let mockBrowser: { newContext: ReturnType<typeof vi.fn> };
  let mockContext: Partial<BrowserContext>;

  beforeEach(() => {
    mockContext = {};
    mockBrowser = {
      newContext: vi.fn().mockResolvedValue(mockContext as BrowserContext),
    };
  });

  describe('createContextOptions', () => {
    it('デフォルト設定から BrowserContextOptions が正しく生成される', () => {
      const factory = new BrowserContextFactory();
      const options = factory.createContextOptions();

      expect(options.javaScriptEnabled).toBe(true);
      expect(options.ignoreHTTPSErrors).toBe(true);
      expect(options.viewport).toBeDefined();
      expect(options.userAgent).toBeDefined();
      expect(options.locale).toBeDefined();
      expect(options.timezoneId).toBeDefined();
    });

    it('オーバーライドオプション（Viewport, UserAgent, Locale, Timezone, StorageState等）が正しく適用される', () => {
      const factory = new BrowserContextFactory();
      const overrides = {
        viewport: { width: 1280, height: 720 },
        userAgent: 'CustomUserAgent/1.0',
        locale: 'en-US',
        timezoneId: 'America/New_York',
        storageState: 'path/to/storageState.json',
        javaScriptEnabled: false,
        ignoreHTTPSErrors: false,
      };

      const options = factory.createContextOptions(overrides);

      expect(options.viewport).toEqual({ width: 1280, height: 720 });
      expect(options.userAgent).toBe('CustomUserAgent/1.0');
      expect(options.locale).toBe('en-US');
      expect(options.timezoneId).toBe('America/New_York');
      expect(options.storageState).toBe('path/to/storageState.json');
      expect(options.javaScriptEnabled).toBe(false);
      expect(options.ignoreHTTPSErrors).toBe(false);
    });

    it('カスタム BrowserSettingsProvider から Viewport, UserAgent, Locale, Timezone などの設定を引き継ぐ', () => {
      const settingsProvider = new BrowserSettingsProvider();
      vi.spyOn(settingsProvider, 'getSettings').mockReturnValue({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'TestAgent/2.0',
        locale: 'ja-JP',
        timezoneId: 'Asia/Tokyo',
      });

      const factory = new BrowserContextFactory({ settingsProvider });
      const options = factory.createContextOptions();

      expect(options.viewport).toEqual({ width: 1920, height: 1080 });
      expect(options.userAgent).toBe('TestAgent/2.0');
      expect(options.locale).toBe('ja-JP');
      expect(options.timezoneId).toBe('Asia/Tokyo');
    });
  });

  describe('createContext', () => {
    it('Browser.newContext() が生成された BrowserContextOptions で呼ばれる', async () => {
      const factory = new BrowserContextFactory();
      const overrides = {
        userAgent: 'ContextTestAgent/1.0',
        locale: 'ja-JP',
      };

      const context = await factory.createContext(mockBrowser as unknown as Browser, overrides);

      expect(mockBrowser.newContext).toHaveBeenCalledTimes(1);
      const passedOptions = mockBrowser.newContext.mock.calls[0][0];
      expect(passedOptions.userAgent).toBe('ContextTestAgent/1.0');
      expect(passedOptions.locale).toBe('ja-JP');
      expect(passedOptions.javaScriptEnabled).toBe(true);
      expect(passedOptions.ignoreHTTPSErrors).toBe(true);
      expect(context).toBe(mockContext);
    });
  });
});

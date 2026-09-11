import { describe, it, expect, afterEach } from 'vitest';
import { PlaywrightBrowserService } from '../src/browser/PlaywrightBrowserService';
import type { OwnedBrowserContext, IdentifiedPage } from '../src/browser/types';

describe('PlaywrightBrowserService Integration Tests', () => {
  let service: PlaywrightBrowserService | null = null;

  afterEach(async () => {
    if (service) {
      try {
        await service.dispose();
      } catch {
        // ignore dispose errors
      }
      service = null;
    }
  });

  // 実ブラウザが必要なテスト。未導入も通常の失敗として通知する。
  describe('initialize()', () => {
    it('実際の Playwright Chromium ブラウザが正常に起動する', async () => {
      service = new PlaywrightBrowserService();
      const browser = await service.initialize({ headless: true });

      expect(browser).toBeDefined();
      expect(browser.isConnected()).toBe(true);
      expect(service.isConnected()).toBe(true);
    });

    it('initialize() を複数回呼んでも同じ Browser インスタンスが返る', async () => {
      service = new PlaywrightBrowserService();
      const browser1 = await service.initialize({ headless: true });
      const browser2 = await service.initialize({ headless: true });

      expect(browser1).toBe(browser2);
      expect(browser1.isConnected()).toBe(true);
    });
  });

  describe('createContext()', () => {
    it('BrowserContext が正常に生成され、Service 所有 (isOwnedByService = true) として管理される', async () => {
      service = new PlaywrightBrowserService();
      await service.initialize({ headless: true });

      const context = (await service.createContext()) as OwnedBrowserContext;

      expect(context).toBeDefined();
      expect(context.isOwnedByService).toBe(true);
    });
  });

  describe('createPage()', () => {
    it('Context 指定ありで Page が生成できる', async () => {
      service = new PlaywrightBrowserService();
      await service.initialize({ headless: true });
      const context = await service.createContext();

      const page = await service.createPage(context);

      expect(page).toBeDefined();
      expect(page.isClosed()).toBe(false);
      expect(page.context()).toBe(context);

      await page.goto('about:blank');
      expect(page.url()).toBe('about:blank');
    });

    it('Context 指定なしでも自動で Service 所有 Context が作られて Page が生成できる', async () => {
      service = new PlaywrightBrowserService();
      await service.initialize({ headless: true });

      const page = await service.createPage();

      expect(page).toBeDefined();
      expect(page.isClosed()).toBe(false);
      expect(service.getContexts().length).toBe(1);
    });

    it('IdentifiedPage として hashId を設定・保持できる', async () => {
      service = new PlaywrightBrowserService();
      await service.initialize({ headless: true });

      const page = (await service.createPage(undefined, { hashId: 'hash_test_123' })) as IdentifiedPage;

      expect(page.hashId).toBe('hash_test_123');
    });
  });

  describe('closePage()', () => {
    it('Page を正常に閉じられる', async () => {
      service = new PlaywrightBrowserService();
      await service.initialize({ headless: true });
      const page = await service.createPage();

      expect(page.isClosed()).toBe(false);

      await service.closePage(page);

      expect(page.isClosed()).toBe(true);
    });
  });

  describe('closeContext()', () => {
    it('Service 所有 Context を正常に閉じられる', async () => {
      service = new PlaywrightBrowserService();
      await service.initialize({ headless: true });
      const context = await service.createContext();

      expect(service.getContexts().includes(context)).toBe(true);

      await service.closeContext(context);

      expect(service.getContexts().includes(context)).toBe(false);
    });
  });

  describe('dispose()', () => {
    it('Browser が正常終了し、Service 所有 Context が全て解放される', async () => {
      service = new PlaywrightBrowserService();
      const browser = await service.initialize({ headless: true });
      await service.createContext();
      await service.createContext();

      expect(service.getContexts().length).toBe(2);

      await service.dispose();

      expect(browser.isConnected()).toBe(false);
      expect(service.isConnected()).toBe(false);
      expect(service.getBrowser()).toBeNull();
      expect(service.getContexts().length).toBe(0);

      service = null;
    });

    it('dispose() を複数回呼んでも安全に完了する', async () => {
      service = new PlaywrightBrowserService();
      await service.initialize({ headless: true });

      await service.dispose();
      await expect(service.dispose()).resolves.not.toThrow();

      service = null;
    });
  });
});

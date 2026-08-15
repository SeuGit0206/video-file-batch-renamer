import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BrowserContext, Page } from 'playwright';
import { BrowserPageFactory } from '../src/factories/BrowserPageFactory';

describe('BrowserPageFactory', () => {
  let mockPage: Partial<Page>;
  let mockContext: { newPage: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPage = {
      setDefaultTimeout: vi.fn(),
      setDefaultNavigationTimeout: vi.fn(),
      setExtraHTTPHeaders: vi.fn().mockResolvedValue(undefined),
      addInitScript: vi.fn().mockResolvedValue(undefined),
    };
    mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage as Page),
    };
  });

  it('Context.newPage() を呼び出して Page を正常に返却する', async () => {
    const factory = new BrowserPageFactory();
    const page = await factory.createPage(mockContext as unknown as BrowserContext);

    expect(mockContext.newPage).toHaveBeenCalledTimes(1);
    expect(page).toBe(mockPage);
  });

  it('options 未指定時は初期設定メソッドが呼ばれない', async () => {
    const factory = new BrowserPageFactory();
    await factory.createPage(mockContext as unknown as BrowserContext);

    expect(mockPage.setDefaultTimeout).not.toHaveBeenCalled();
    expect(mockPage.setDefaultNavigationTimeout).not.toHaveBeenCalled();
    expect(mockPage.setExtraHTTPHeaders).not.toHaveBeenCalled();
    expect(mockPage.addInitScript).not.toHaveBeenCalled();
  });

  it('Default Timeout および Navigation Timeout が正しく設定される', async () => {
    const factory = new BrowserPageFactory();
    await factory.createPage(mockContext as unknown as BrowserContext, {
      defaultTimeout: 15000,
      defaultNavigationTimeout: 30000,
    });

    expect(mockPage.setDefaultTimeout).toHaveBeenCalledWith(15000);
    expect(mockPage.setDefaultNavigationTimeout).toHaveBeenCalledWith(30000);
  });

  it('Extra HTTP Headers が正しく設定される', async () => {
    const factory = new BrowserPageFactory();
    const headers = { 'X-Test-Header': 'TestValue', 'Accept-Language': 'ja' };
    await factory.createPage(mockContext as unknown as BrowserContext, {
      extraHTTPHeaders: headers,
    });

    expect(mockPage.setExtraHTTPHeaders).toHaveBeenCalledWith(headers);
  });

  it('初期 Script (initScripts) が正しく注入される', async () => {
    const factory = new BrowserPageFactory();
    const scripts = ['console.log("script1")', 'console.log("script2")'];
    await factory.createPage(mockContext as unknown as BrowserContext, {
      initScripts: scripts,
    });

    expect(mockPage.addInitScript).toHaveBeenCalledTimes(2);
    expect(mockPage.addInitScript).toHaveBeenNthCalledWith(1, 'console.log("script1")');
    expect(mockPage.addInitScript).toHaveBeenNthCalledWith(2, 'console.log("script2")');
  });
});

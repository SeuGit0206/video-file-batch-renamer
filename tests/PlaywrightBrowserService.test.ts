import { describe, it, expect, beforeEach, vi } from 'vitest';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { PlaywrightBrowserService } from '../src/browser/PlaywrightBrowserService';
import type { OwnedBrowserContext } from '../src/browser/types';

vi.mock('playwright', () => {
  return {
    chromium: {
      launch: vi.fn(),
    },
  };
});

interface MockPage {
  isClosed: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

interface MockContext {
  newPage: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

interface MockBrowser {
  isConnected: ReturnType<typeof vi.fn>;
  newContext: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

describe('PlaywrightBrowserService', () => {
  let mockBrowser: MockBrowser;
  let mockContext: MockContext;
  let mockPage: MockPage;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPage = {
      isClosed: vi.fn().mockReturnValue(false),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockBrowser = {
      isConnected: vi.fn().mockReturnValue(true),
      newContext: vi.fn().mockResolvedValue(mockContext),
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(chromium.launch).mockResolvedValue(mockBrowser as unknown as Browser);
  });

  describe('initialize()', () => {
    it('Browser が正常に起動できる', async () => {
      const service = new PlaywrightBrowserService();
      const browser = await service.initialize();

      expect(chromium.launch).toHaveBeenCalledTimes(1);
      expect(browser).toBe(mockBrowser);
      expect(service.isConnected()).toBe(true);
    });

    it('Browser が既に起動済みの場合は再利用される', async () => {
      const service = new PlaywrightBrowserService();
      await service.initialize();
      const browser2 = await service.initialize();

      expect(chromium.launch).toHaveBeenCalledTimes(1);
      expect(browser2).toBe(mockBrowser);
    });

    it('initialize() が並行して複数回呼ばれた場合でも重複起動せず単一の Browser インスタンスを返す', async () => {
      const service = new PlaywrightBrowserService();
      const [b1, b2, b3] = await Promise.all([
        service.initialize(),
        service.initialize(),
        service.initialize(),
      ]);

      expect(chromium.launch).toHaveBeenCalledTimes(1);
      expect(b1).toBe(mockBrowser);
      expect(b2).toBe(mockBrowser);
      expect(b3).toBe(mockBrowser);
    });

    it('initialize() が失敗した場合、再試行時に再実行される', async () => {
      vi.mocked(chromium.launch)
        .mockRejectedValueOnce(new Error('Temporary launch failure'))
        .mockResolvedValueOnce(mockBrowser as unknown as Browser);

      const service = new PlaywrightBrowserService();
      await expect(service.initialize()).rejects.toThrow();

      const browser = await service.initialize();
      expect(browser).toBe(mockBrowser);
      expect(chromium.launch).toHaveBeenCalledTimes(2);
    });

    it('Chromium 未インストール時に適切な例外となる (Executable doesn\'t exist)', async () => {
      vi.mocked(chromium.launch).mockRejectedValueOnce(
        new Error("Executable doesn't exist at /path/to/chromium")
      );

      const service = new PlaywrightBrowserService();
      await expect(service.initialize()).rejects.toThrow(
        'Playwrightブラウザがインストールされていません。'
      );
    });

    it('Chromium 未インストール時に isBrowserMissing フラグが付与されたエラーになる', async () => {
      vi.mocked(chromium.launch).mockRejectedValueOnce(
        new Error("Please run playwright install chromium")
      );

      const service = new PlaywrightBrowserService();
      try {
        await service.initialize();
        expect.fail('例外がスローされませんでした');
      } catch (err: unknown) {
        expect((err as { isBrowserMissing?: boolean }).isBrowserMissing).toBe(true);
      }
    });

    it('Browser 起動失敗時に一般的な初期化エラーへ変換される', async () => {
      vi.mocked(chromium.launch).mockRejectedValueOnce(
        new Error('Unknown connection timeout')
      );

      const service = new PlaywrightBrowserService();
      await expect(service.initialize()).rejects.toThrow(
        'Playwrightブラウザの起動に失敗しました: Unknown connection timeout'
      );
    });

    it('カスタム IBrowserLauncher を DI して利用できる', async () => {
      const mockCustomBrowser = {
        isConnected: vi.fn().mockReturnValue(true),
        close: vi.fn().mockResolvedValue(undefined),
      } as unknown as Browser;

      const customLauncher = {
        createLaunchOptions: vi.fn().mockReturnValue({ headless: false }),
        launch: vi.fn().mockResolvedValue(mockCustomBrowser),
        launchPersistentContext: vi.fn(),
      };

      const service = new PlaywrightBrowserService(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        customLauncher
      );

      const browser = await service.initialize({ headless: false });

      expect(customLauncher.launch).toHaveBeenCalledWith({ headless: false });
      expect(browser).toBe(mockCustomBrowser);
    });

    it('BrowserLauncher からの例外が呼び出し元にそのまま伝播する', async () => {
      const customLauncher = {
        createLaunchOptions: vi.fn(),
        launch: vi.fn().mockRejectedValue(new Error('Launcher launch failed')),
        launchPersistentContext: vi.fn(),
      };

      const service = new PlaywrightBrowserService(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        customLauncher
      );

      await expect(service.initialize()).rejects.toThrow('Launcher launch failed');
    });
  });

  describe('createContext()', () => {
    it('Context が生成される', async () => {
      const service = new PlaywrightBrowserService();
      const context = await service.createContext();

      expect(chromium.launch).toHaveBeenCalledTimes(1);
      expect(mockBrowser.newContext).toHaveBeenCalledTimes(1);
      expect(context).toBe(mockContext);
    });

    it('Service 所有 Context に isOwnedByService = true が設定される', async () => {
      const service = new PlaywrightBrowserService();
      const context = (await service.createContext()) as OwnedBrowserContext;

      expect(context.isOwnedByService).toBe(true);
    });

    it('カスタム IBrowserContextFactory を利用して Context を生成できる', async () => {
      const mockFactoryContext = {
        close: vi.fn().mockResolvedValue(undefined),
      } as unknown as BrowserContext;

      const customContextFactory = {
        createContextOptions: vi.fn().mockReturnValue({ javaScriptEnabled: true }),
        createContext: vi.fn().mockResolvedValue(mockFactoryContext),
      };

      const service = new PlaywrightBrowserService(undefined, undefined, undefined, customContextFactory);
      const context = await service.createContext({ locale: 'ja-JP' });

      expect(customContextFactory.createContext).toHaveBeenCalledWith(mockBrowser, { locale: 'ja-JP' });
      expect(context).toBe(mockFactoryContext);
    });
  });

  describe('createPage()', () => {
    it('Context 指定ありの場合、指定された Context から Page を生成する', async () => {
      const externalPage = {
        isClosed: vi.fn().mockReturnValue(false),
        close: vi.fn().mockResolvedValue(undefined),
      };
      const externalContext = {
        newPage: vi.fn().mockResolvedValue(externalPage),
      } as unknown as BrowserContext;

      const service = new PlaywrightBrowserService();
      const page = await service.createPage(externalContext);

      expect(externalContext.newPage).toHaveBeenCalledTimes(1);
      expect(page).toBe(externalPage);
    });

    it('Context 指定なしの場合、新規 Service 所有 Context を自動生成して Page を生成する', async () => {
      const service = new PlaywrightBrowserService();
      const page = await service.createPage();

      expect(mockBrowser.newContext).toHaveBeenCalledTimes(1);
      expect(mockContext.newPage).toHaveBeenCalledTimes(1);
      expect(page).toBe(mockPage);
    });

    it('カスタム IBrowserPageFactory を利用して Page を生成・委譲できる', async () => {
      const mockFactoryPage = {
        isClosed: vi.fn().mockReturnValue(false),
        close: vi.fn().mockResolvedValue(undefined),
      } as unknown as Page;

      const customPageFactory = {
        createPage: vi.fn().mockResolvedValue(mockFactoryPage),
      };

      const service = new PlaywrightBrowserService(undefined, undefined, undefined, undefined, customPageFactory);
      const page = await service.createPage(undefined, undefined, { defaultTimeout: 10000 });

      expect(customPageFactory.createPage).toHaveBeenCalledWith(expect.anything(), { defaultTimeout: 10000 });
      expect(page).toBe(mockFactoryPage);
    });
  });

  describe('closePage()', () => {
    it('Page が正常に閉じられる', async () => {
      const service = new PlaywrightBrowserService();
      await service.closePage(mockPage as unknown as Page);

      expect(mockPage.close).toHaveBeenCalledTimes(1);
    });

    it('既に閉じられている Page (isClosed = true) の場合は close() が呼ばれない', async () => {
      mockPage.isClosed.mockReturnValue(true);
      const service = new PlaywrightBrowserService();
      await service.closePage(mockPage as unknown as Page);

      expect(mockPage.close).not.toHaveBeenCalled();
    });

    it('二重 close でも例外にならない', async () => {
      const service = new PlaywrightBrowserService();
      await service.closePage(mockPage as unknown as Page);
      mockPage.isClosed.mockReturnValue(true);
      await expect(service.closePage(mockPage as unknown as Page)).resolves.not.toThrow();
    });
  });

  describe('closeContext()', () => {
    it('Service 所有 Context が閉じられる', async () => {
      const service = new PlaywrightBrowserService();
      const context = await service.createContext();
      await service.closeContext(context);

      expect(mockContext.close).toHaveBeenCalledTimes(1);
    });

    it('外部 Context が渡されても安全に close 処理を行い、誤って全体破棄はしない', async () => {
      const externalContext = {
        close: vi.fn().mockResolvedValue(undefined),
      } as unknown as BrowserContext;

      const service = new PlaywrightBrowserService();
      await expect(service.closeContext(externalContext)).resolves.not.toThrow();
      expect(externalContext.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('dispose()', () => {
    it('Browser が破棄される', async () => {
      const service = new PlaywrightBrowserService();
      await service.initialize();
      await service.dispose();

      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
      expect(service.isConnected()).toBe(false);
    });

    it('Service 所有 Context がすべて破棄される', async () => {
      const service = new PlaywrightBrowserService();
      await service.createContext();
      await service.dispose();

      expect(mockContext.close).toHaveBeenCalledTimes(1);
      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });

    it('複数回 dispose() を呼んでも安全に動作する', async () => {
      const service = new PlaywrightBrowserService();
      await service.createContext();
      await service.dispose();
      await expect(service.dispose()).resolves.not.toThrow();

      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });
  });
});

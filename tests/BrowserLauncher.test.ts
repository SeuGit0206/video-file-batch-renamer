import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chromium, type Browser, type BrowserContext } from 'playwright';
import { BrowserLauncher } from '../src/factories/BrowserLauncher';
import { BrowserMissingError } from '../src/errors';
import { BrowserSettingsProvider } from '../src/browser/BrowserSettingsProvider';

describe('BrowserLauncher', () => {
  let mockBrowser: Partial<Browser>;
  let mockContext: Partial<BrowserContext>;

  beforeEach(() => {
    mockBrowser = {
      isConnected: vi.fn().mockReturnValue(true),
      close: vi.fn().mockResolvedValue(undefined),
    };
    mockContext = {
      close: vi.fn().mockResolvedValue(undefined),
    };
    vi.restoreAllMocks();
  });

  describe('createLaunchOptions', () => {
    it('デフォルト設定から LaunchOptions を生成する', () => {
      const launcher = new BrowserLauncher();
      const options = launcher.createLaunchOptions();

      expect(options.headless).toBe(true);
    });

    it('オーバーライドオプション（headless, executablePath, args, timeout等）を適用して LaunchOptions を生成する', () => {
      const launcher = new BrowserLauncher();
      const overrides = {
        headless: false,
        executablePath: '/custom/path/to/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 30000,
      };

      const options = launcher.createLaunchOptions(overrides);

      expect(options.headless).toBe(false);
      expect(options.executablePath).toBe('/custom/path/to/chromium');
      expect(options.args).toEqual(['--no-sandbox', '--disable-setuid-sandbox']);
      expect(options.timeout).toBe(30000);
    });

    it('BrowserSettingsProvider の設定（headless, executablePath）を引き継ぐ', () => {
      const settingsProvider = new BrowserSettingsProvider();
      vi.spyOn(settingsProvider, 'getSettings').mockReturnValue({
        headless: false,
        executablePath: '/provider/path/chromium',
      });

      const launcher = new BrowserLauncher({ settingsProvider });
      const options = launcher.createLaunchOptions();

      expect(options.headless).toBe(false);
      expect(options.executablePath).toBe('/provider/path/chromium');
    });
  });

  describe('launch', () => {
    it('chromium.launch() を呼び出し Browser インスタンスを返却する', async () => {
      const launchSpy = vi.spyOn(chromium, 'launch').mockResolvedValue(mockBrowser as Browser);

      const launcher = new BrowserLauncher();
      const browser = await launcher.launch({ headless: true });

      expect(launchSpy).toHaveBeenCalledTimes(1);
      expect(launchSpy).toHaveBeenCalledWith(expect.objectContaining({ headless: true }));
      expect(browser).toBe(mockBrowser);
    });

    it('Chromium 未インストールエラー発生時に BrowserMissingError をスローする', async () => {
      vi.spyOn(chromium, 'launch').mockRejectedValue(new Error("Executable doesn't exist at /path/to/chromium"));

      const launcher = new BrowserLauncher();

      await expect(launcher.launch()).rejects.toThrow(BrowserMissingError);
    });

    it('一般のエラー発生時に Playwrightブラウザの起動に失敗しました メッセージのエラーをスローする', async () => {
      vi.spyOn(chromium, 'launch').mockRejectedValue(new Error('Unknown connection timeout'));

      const launcher = new BrowserLauncher();

      await expect(launcher.launch()).rejects.toThrow('Playwrightブラウザの起動に失敗しました: Unknown connection timeout');
    });
  });

  describe('launchPersistentContext', () => {
    it('chromium.launchPersistentContext() を呼び出し BrowserContext インスタンスを返却する', async () => {
      const launchPersistentSpy = vi
        .spyOn(chromium, 'launchPersistentContext')
        .mockResolvedValue(mockContext as BrowserContext);

      const launcher = new BrowserLauncher();
      const context = await launcher.launchPersistentContext('/tmp/user-data', { headless: true, locale: 'ja-JP' });

      expect(launchPersistentSpy).toHaveBeenCalledTimes(1);
      expect(launchPersistentSpy).toHaveBeenCalledWith(
        '/tmp/user-data',
        expect.objectContaining({ headless: true, locale: 'ja-JP' })
      );
      expect(context).toBe(mockContext);
    });

    it('launchPersistentContext での例外発生時にも例外標準化ロジックを通る', async () => {
      vi.spyOn(chromium, 'launchPersistentContext').mockRejectedValue(new Error("Please run playwright install"));

      const launcher = new BrowserLauncher();

      await expect(launcher.launchPersistentContext('/tmp/user-data')).rejects.toThrow(BrowserMissingError);
    });
  });
});

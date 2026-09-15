import fs from 'fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Browser, BrowserContext } from 'playwright';
import { CloudflareDetectionStep } from '../../src/steps/CloudflareDetectionStep';
import { ScrapingContext } from '../../src/steps/ScrapingContext';
import { CloudflareService } from '../../src/services/CloudflareService';
import type { PlaywrightBrowserService } from '../../src/browser/PlaywrightBrowserService';
import type { IdentifiedPage } from '../../src/browser/types';
import type { BrowserConfigFactory } from '../../src/browser/BrowserConfigFactory';
import type { BrowserSettingsProvider } from '../../src/browser/BrowserSettingsProvider';
import type { ILogger, ICdpDiagnosticsService, IDiagnosticsStorageService } from '../../src/services';
import type { IRetryPolicy } from '../../src/policies';
import type { IStealthStrategy } from '../../src/strategies';
import { BROWSER_CLOSE_TIMEOUT_MS } from '../../src/browser/closeWithTimeout';

describe('CloudflareDetectionStep browser switch', () => {
  const stopAfterNewPage = new Error('stop after new page creation');

  beforeEach(() => {
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    vi.spyOn(CloudflareService, 'checkCloudflare').mockReturnValue(['Cloudflare challenge']);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function setup() {
    const closeOrder: string[] = [];
    const oldPage = { close: vi.fn(async () => { closeOrder.push('Page'); }) } as unknown as IdentifiedPage;
    const oldContext = { close: vi.fn(async () => { closeOrder.push('Context'); }) } as unknown as BrowserContext;
    const oldBrowser = { close: vi.fn(async () => { closeOrder.push('Browser'); }) } as unknown as Browser;

    const newBrowser = { close: vi.fn().mockResolvedValue(undefined) } as unknown as Browser;
    const newContext = {
      close: vi.fn().mockResolvedValue(undefined),
      addInitScript: vi.fn().mockResolvedValue(undefined),
      cookies: vi.fn().mockResolvedValue([]),
    } as unknown as BrowserContext;
    const newPage = { hashId: '' } as IdentifiedPage;
    const switchService = {
      closePage: vi.fn(async (page: IdentifiedPage) => { await page.close(); }),
      closeContext: vi.fn(async (context: BrowserContext) => { await context.close(); }),
      dispose: vi.fn().mockResolvedValue(undefined),
      initialize: vi.fn(async () => { closeOrder.push('New Browser'); return newBrowser; }),
      createContext: vi.fn().mockResolvedValue(newContext),
      createPage: vi.fn().mockResolvedValue(newPage),
    } as unknown as PlaywrightBrowserService;

    const ctx = new ScrapingContext('ABC-123', 'https://missav.ai/ja');
    ctx.page = oldPage;
    ctx.context = oldContext;
    ctx.browser = oldBrowser;
    ctx.pageTitle = 'Just a moment...';
    ctx.status = 403;
    ctx.html = '<html>Cloudflare challenge</html>';

    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as unknown as ILogger;
    const step = new CloudflareDetectionStep(
      {} as BrowserSettingsProvider,
      { createContextOptions: vi.fn().mockReturnValue({}) } as unknown as BrowserConfigFactory,
      logger,
      { getMaxRetries: vi.fn().mockReturnValue(1), shouldRetry: vi.fn().mockReturnValue(true) } as unknown as IRetryPolicy,
      { handleCloudflareDetected: vi.fn().mockResolvedValue(undefined) } as unknown as IStealthStrategy,
      { setupCDPTracking: vi.fn().mockRejectedValue(stopAfterNewPage) } as unknown as ICdpDiagnosticsService,
      {} as IDiagnosticsStorageService,
      () => switchService,
    );

    return { step, ctx, oldPage, oldContext, oldBrowser, switchService, newBrowser, newContext, newPage, logger, closeOrder };
  }

  it('古いPage・Context・Browserを順に閉じてから新しい資源へ切り替える', async () => {
    const state = setup();
    await expect(state.step.execute(state.ctx)).rejects.toBe(stopAfterNewPage);

    expect(state.oldPage.close).toHaveBeenCalledOnce();
    expect(state.oldContext.close).toHaveBeenCalledOnce();
    expect(state.oldBrowser.close).toHaveBeenCalledOnce();
    expect(state.switchService.dispose).not.toHaveBeenCalled();
    expect(state.closeOrder).toEqual(['Page', 'Context', 'Browser', 'New Browser']);
    expect(state.switchService.initialize).toHaveBeenCalledOnce();
    expect(state.switchService.createContext).toHaveBeenCalledOnce();
    expect(state.switchService.createPage).toHaveBeenCalledOnce();
    expect(state.newBrowser.close).not.toHaveBeenCalled();
    expect(state.ctx.browser).toBe(state.newBrowser);
    expect(state.ctx.context).toBe(state.newContext);
    expect(state.ctx.page).toBe(state.newPage);
    expect([state.ctx.page, state.ctx.context, state.ctx.browser]).not.toContain(state.oldBrowser);
    expect(state.logger.warn).not.toHaveBeenCalled();
  });

  it('古い資源のcloseが全て失敗しても警告を出して新しいBrowserを生成する', async () => {
    const state = setup();
    vi.mocked(state.oldPage.close).mockRejectedValue(new Error('Page close failed'));
    vi.mocked(state.oldContext.close).mockRejectedValue(new Error('Context close failed'));
    vi.mocked(state.oldBrowser.close).mockRejectedValue(new Error('Browser close failed'));

    await expect(state.step.execute(state.ctx)).rejects.toBe(stopAfterNewPage);
    expect(state.oldPage.close).toHaveBeenCalledOnce();
    expect(state.oldContext.close).toHaveBeenCalledOnce();
    expect(state.oldBrowser.close).toHaveBeenCalledOnce();
    expect(state.switchService.initialize).toHaveBeenCalledOnce();
    expect(state.ctx.browser).toBe(state.newBrowser);
    expect(state.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Page close failed'));
    expect(state.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Context close failed'));
    expect(state.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Browser close failed'));
  });

  it('古いPageのcloseが停止しても4秒後にContext・Browser・新規生成へ進む', async () => {
    vi.useFakeTimers();
    const state = setup();
    let release!: () => void;
    const pendingClose = new Promise<void>((resolve) => { release = resolve; });
    vi.mocked(state.oldPage.close).mockReturnValue(pendingClose);

    const execution = state.step.execute(state.ctx);
    const completion = expect(execution).rejects.toBe(stopAfterNewPage);
    await vi.advanceTimersByTimeAsync(0);
    expect(state.oldPage.close).toHaveBeenCalledOnce();
    expect(state.oldContext.close).not.toHaveBeenCalled();
    expect(state.oldBrowser.close).not.toHaveBeenCalled();
    expect(state.switchService.initialize).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(BROWSER_CLOSE_TIMEOUT_MS);
    await completion;
    expect(state.oldContext.close).toHaveBeenCalledOnce();
    expect(state.oldBrowser.close).toHaveBeenCalledOnce();
    expect(state.switchService.initialize).toHaveBeenCalledOnce();
    expect(state.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Page close timed out'));
    release();
    vi.useRealTimers();
  });

  it('古いContextのcloseが停止しても4秒後にBrowser・新規生成へ進む', async () => {
    vi.useFakeTimers();
    const state = setup();
    let release!: () => void;
    const pendingClose = new Promise<void>((resolve) => { release = resolve; });
    vi.mocked(state.oldContext.close).mockReturnValue(pendingClose);

    const execution = state.step.execute(state.ctx);
    const completion = expect(execution).rejects.toBe(stopAfterNewPage);
    await vi.advanceTimersByTimeAsync(0);
    expect(state.oldContext.close).toHaveBeenCalledOnce();
    expect(state.oldBrowser.close).not.toHaveBeenCalled();
    expect(state.switchService.initialize).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(BROWSER_CLOSE_TIMEOUT_MS);
    await completion;
    expect(state.oldBrowser.close).toHaveBeenCalledOnce();
    expect(state.switchService.initialize).toHaveBeenCalledOnce();
    expect(state.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Context close timed out'));
    release();
    vi.useRealTimers();
  });

  it('古いBrowserのcloseが停止しても4秒後に新しいBrowserを生成する', async () => {
    vi.useFakeTimers();
    const state = setup();
    let release!: () => void;
    const pendingClose = new Promise<void>((resolve) => { release = resolve; });
    vi.mocked(state.oldBrowser.close).mockReturnValue(pendingClose);

    const execution = state.step.execute(state.ctx);
    const completion = expect(execution).rejects.toBe(stopAfterNewPage);
    await vi.advanceTimersByTimeAsync(0);
    expect(state.oldPage.close).toHaveBeenCalledOnce();
    expect(state.oldContext.close).toHaveBeenCalledOnce();
    expect(state.oldBrowser.close).toHaveBeenCalledOnce();
    expect(state.switchService.initialize).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(BROWSER_CLOSE_TIMEOUT_MS);
    await completion;
    expect(state.switchService.initialize).toHaveBeenCalledOnce();
    expect(state.newBrowser.close).not.toHaveBeenCalled();
    expect(state.ctx.browser).toBe(state.newBrowser);
    expect(state.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Browser close timed out'));
    release();
    vi.useRealTimers();
  });
});

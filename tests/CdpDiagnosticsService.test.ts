import { describe, it, expect, vi } from 'vitest';
import { CdpDiagnosticsService } from '../src/services/CdpDiagnosticsService';
import type { BrowserContext, Page, CDPSession } from 'playwright';

describe('CdpDiagnosticsService', () => {
  it('setupCDPTracking が CDP セッションを確立しイベント登録と saveCDP 関数を返す', async () => {
    const mockStorageService = {
      ensureDiagnosticsDir: vi.fn(),
      savePlaywrightDiff: vi.fn(),
      savePageComparison: vi.fn(),
      saveCDPLog: vi.fn(),
      saveFingerprint: vi.fn(),
      runAndSaveFingerprint: vi.fn(),
      saveHtmlLog: vi.fn(),
      runAndSaveHTML: vi.fn(),
    };

    const service = new CdpDiagnosticsService(undefined, mockStorageService);

    const mockCdpSession = {
      send: vi.fn().mockResolvedValue(undefined),
      emit: vi.fn(),
    } as unknown as CDPSession;

    const mockContext = {
      newCDPSession: vi.fn().mockResolvedValue(mockCdpSession),
    } as unknown as BrowserContext;

    const mockPage = {} as Page;

    const result = await service.setupCDPTracking(mockContext, mockPage, 'test-suffix');

    expect(mockContext.newCDPSession).toHaveBeenCalledWith(mockPage);
    expect(mockCdpSession.send).toHaveBeenCalledWith('Network.enable');
    expect(mockCdpSession.send).toHaveBeenCalledWith('Page.enable');
    expect(mockCdpSession.send).toHaveBeenCalledWith('Runtime.enable');
    expect(mockCdpSession.send).toHaveBeenCalledWith('Security.enable');
    expect(mockCdpSession.send).toHaveBeenCalledWith('Log.enable');
    expect(mockCdpSession.send).toHaveBeenCalledWith('Performance.enable');

    expect(result.cdpClient).toBe(mockCdpSession);
    expect(typeof result.saveCDP).toBe('function');

    // saveCDP 実行時のストレージ呼び出し確認
    result.saveCDP();
    expect(mockStorageService.saveCDPLog).toHaveBeenCalledWith('test-suffix', expect.any(Array));
  });

  it('CDP セッション確立エラー発生時はエラーハンドリングして null クライアントと no-op を返す', async () => {
    const service = new CdpDiagnosticsService();

    const mockContext = {
      newCDPSession: vi.fn().mockRejectedValue(new Error('CDP not supported')),
    } as unknown as BrowserContext;

    const mockPage = {} as Page;

    const result = await service.setupCDPTracking(mockContext, mockPage, 'test-error');

    expect(result.cdpClient).toBeNull();
    expect(() => result.saveCDP()).not.toThrow();
  });
});

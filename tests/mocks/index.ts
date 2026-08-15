import type { Request, Response } from 'express';
import { vi } from 'vitest';

/**
 * Express の Request & Response モックオブジェクトを生成するユーティリティ
 */
export function createMockExpressContext(queryParams: Record<string, unknown> = {}) {
  const req = {
    query: queryParams
  } as unknown as Request;

  const jsonMock = vi.fn();
  const statusMock = vi.fn().mockImplementation(() => ({
    json: jsonMock
  }));

  const res = {
    status: statusMock,
    json: jsonMock
  } as unknown as Response;

  return { req, res, statusMock, jsonMock };
}

/**
 * Playwright モックオブジェクト群を生成するユーティリティ
 */
export function createMockPlaywrightObjects() {
  const mockPage = {
    hashId: 'Page[MOCK123]',
    url: vi.fn().mockReturnValue('https://missav.ai/ja/abc-123'),
    title: vi.fn().mockResolvedValue('サンプルタイトル ABC-123 - MissAV'),
    content: vi.fn().mockResolvedValue('<html><body><h1>サンプルタイトル ABC-123</h1></body></html>'),
    goto: vi.fn().mockResolvedValue({
      status: vi.fn().mockReturnValue(200),
      url: vi.fn().mockReturnValue('https://missav.ai/ja/abc-123')
    }),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    waitForURL: vi.fn().mockResolvedValue(undefined),
    waitForFunction: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue({ status: vi.fn().mockReturnValue(200) }),
    evaluate: vi.fn().mockImplementation(async (fn: unknown, arg?: unknown) => {
      if (typeof fn === 'function') {
        return fn(arg);
      }
      return null;
    }),
    on: vi.fn(),
    off: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    locator: vi.fn().mockReturnValue({
      count: vi.fn().mockResolvedValue(1)
    })
  };

  const mockContext = {
    cookies: vi.fn().mockResolvedValue([]),
    addCookies: vi.fn().mockResolvedValue(undefined),
    addInitScript: vi.fn().mockResolvedValue(undefined),
    storageState: vi.fn().mockResolvedValue(undefined),
    newCDPSession: vi.fn().mockResolvedValue({
      send: vi.fn().mockResolvedValue(undefined)
    }),
    close: vi.fn().mockResolvedValue(undefined)
  };

  const mockBrowser = {
    version: vi.fn().mockResolvedValue('Chrome/124.0.0.0'),
    close: vi.fn().mockResolvedValue(undefined)
  };

  return { mockPage, mockContext, mockBrowser };
}

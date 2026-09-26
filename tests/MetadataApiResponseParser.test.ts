import { describe, expect, it, vi } from 'vitest';
import { MetadataController } from '../src/controllers/MetadataController';
import { parseMetadataApiResponse } from '../src/services/MetadataApiResponseParser';
import { mockScrapedMetadata } from './fixtures';
import { createMockExpressContext } from './mocks';

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

describe('MetadataApiResponseParser', () => {
  it('JSON直下のメタデータを成功レスポンスとして返す', async () => {
    await expect(parseMetadataApiResponse(response(mockScrapedMetadata)))
      .resolves.toEqual(mockScrapedMetadata);
  });

  it('{ data: metadata }形式を成功レスポンスとして返す', async () => {
    await expect(parseMetadataApiResponse(response({ data: mockScrapedMetadata })))
      .resolves.toEqual(mockScrapedMetadata);
  });

  it('{ error: ... }形式を従来どおりエラーとして扱う', async () => {
    await expect(parseMetadataApiResponse(response({
      error: 'メタデータ取得失敗',
      errorCode: 'E2004',
    }))).rejects.toMatchObject({
      message: 'メタデータ取得失敗',
      status: 404,
      code: 'E2004',
    });
  });

  it('メタデータがない成功レスポンスを従来どおりエラーとして扱う', async () => {
    await expect(parseMetadataApiResponse(response({}))).rejects.toMatchObject({
      message: 'メタデータが見つかりませんでした',
      status: 404,
      code: 'E2004',
    });
  });

  it('MetadataControllerの実際の成功レスポンスをそのまま解析できる', async () => {
    const fetcher = vi.fn().mockResolvedValue(mockScrapedMetadata);
    const controller = new MetadataController(fetcher);
    const { req, res, statusMock, jsonMock } = createMockExpressContext({ id: 'abc-123' });

    await controller.getMetadata(req, res);

    expect(statusMock).toHaveBeenCalledWith(200);
    const controllerBody = jsonMock.mock.calls[0]?.[0];
    await expect(parseMetadataApiResponse(response(controllerBody)))
      .resolves.toEqual(mockScrapedMetadata);
  });
});

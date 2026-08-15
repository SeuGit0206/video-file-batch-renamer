import { describe, it, expect, vi } from 'vitest';
import { GetMetadataUseCase } from '../src/usecases/GetMetadataUseCase';
import { ScraperError } from '../src/errors';
import { HTTP_STATUS } from '../src/constants';
import { mockScrapedMetadata } from './fixtures';

describe('GetMetadataUseCase', () => {
  it('正常取得: Orchestrator から取得したメタデータをそのまま返却する', async () => {
    const mockFetcher = vi.fn().mockResolvedValue(mockScrapedMetadata);
    const useCase = new GetMetadataUseCase(mockFetcher);

    const result = await useCase.execute('ABC-123');

    expect(mockFetcher).toHaveBeenCalledWith('ABC-123');
    expect(result).toEqual(mockScrapedMetadata);
  });

  it('NotFound: 404 ScraperError がスローされた場合例外をそのまま伝播する', async () => {
    const notFoundError = new ScraperError('MissAV returned HTTP status 404.', {
      status: HTTP_STATUS.NOT_FOUND
    });
    const mockFetcher = vi.fn().mockRejectedValue(notFoundError);
    const useCase = new GetMetadataUseCase(mockFetcher);

    await expect(useCase.execute('NOTFOUND-001')).rejects.toThrow(notFoundError);
  });

  it('ScraperError: 500 等の ScraperError がスローされた場合例外をそのまま伝播する', async () => {
    const blockedError = new ScraperError('Cloudflare blocked request (403 Forbidden).', {
      status: HTTP_STATUS.FORBIDDEN
    });
    const mockFetcher = vi.fn().mockRejectedValue(blockedError);
    const useCase = new GetMetadataUseCase(mockFetcher);

    await expect(useCase.execute('BLOCKED-001')).rejects.toThrow(blockedError);
  });

  it('Unknown Error: 一般のエラーオブジェクトがスローされた場合例外をそのまま伝播する', async () => {
    const unknownError = new Error('Unexpected network failure');
    const mockFetcher = vi.fn().mockRejectedValue(unknownError);
    const useCase = new GetMetadataUseCase(mockFetcher);

    await expect(useCase.execute('ERR-001')).rejects.toThrow(unknownError);
  });
});

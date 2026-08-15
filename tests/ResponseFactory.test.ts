import { describe, it, expect } from 'vitest';
import { ResponseFactory } from '../src/factories/ResponseFactory';
import type { ScrapedMetadata } from '../src/types';

describe('ResponseFactory', () => {
  const factory = new ResponseFactory();

  it('createSuccessResponse は受け取ったデータをそのまま返却する', () => {
    const data = { foo: 'bar', count: 123 };
    const result = factory.createSuccessResponse(data);
    expect(result).toBe(data);
  });

  it('createMetadataResponse は ScrapedMetadata オブジェクトを正常に返却する', () => {
    const metadata: ScrapedMetadata = {
      productId: 'ABC-123',
      title: 'Sample Title',
      actress: 'Yamada Hanako',
      series: 'Series A',
      maker: 'Maker B',
      releaseDate: '2026-01-01',
    };
    const result = factory.createMetadataResponse(metadata);
    expect(result).toEqual(metadata);
  });

  it('createBadRequestResponse はエラーメッセージを含むオブジェクトを返却する', () => {
    const message = 'Missing or invalid "id" parameter.';
    const result = factory.createBadRequestResponse(message);
    expect(result).toEqual({ error: message });
  });
});

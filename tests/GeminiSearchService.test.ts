import fs from 'fs';
import type { GoogleGenAI } from '@google/genai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MISSAV_JA_BASE_URL } from '../src/constants';
import { GeminiSearchService } from '../src/services/GeminiSearchService';
import { LoggingService } from '../src/services/LoggingService';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof fs>('fs');
  return {
    ...actual,
    default: {
      ...actual,
      writeFileSync: vi.fn(),
    },
    writeFileSync: vi.fn(),
  };
});

const metadata = {
  title: '作品タイトル',
  actress: '出演者名',
  releaseDate: '2026-09-13',
  series: 'シリーズ名',
};

function createAiClient(response: unknown): GoogleGenAI {
  return {
    models: {
      generateContent: vi.fn().mockResolvedValue(response),
    },
  } as unknown as GoogleGenAI;
}

describe('GeminiSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
    vi.spyOn(LoggingService.getInstance(), 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('AI応答が空の場合は成功結果を返さない', async () => {
    const aiClient = createAiClient({ text: '' });

    await expect(
      GeminiSearchService.fetchMetadataWithGeminiSearch('abc-123', aiClient)
    ).rejects.toThrow('Gemini returned an empty response.');
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('AI応答が不正JSONの場合は成功結果を返さない', async () => {
    const aiClient = createAiClient({ text: '{invalid json' });

    await expect(
      GeminiSearchService.fetchMetadataWithGeminiSearch('abc-123', aiClient)
    ).rejects.toBeInstanceOf(SyntaxError);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('候補URLがない正常応答では商品IDから既定URLを生成する', async () => {
    const aiClient = createAiClient({ text: JSON.stringify({ ...metadata, series: '' }) });

    const result = await GeminiSearchService.fetchMetadataWithGeminiSearch('abc-123', aiClient);

    expect(result).toEqual(expect.objectContaining({
      productId: 'ABC-123',
      title: metadata.title,
      actress: metadata.actress,
      releaseDate: metadata.releaseDate,
      series: 'MissAV',
    }));
    expect(result.debug.finalUrl).toBe(`${MISSAV_JA_BASE_URL}/abc-123`);
  });

  it('補助HTMLの保存失敗後も検索結果と候補URLを返す', async () => {
    vi.mocked(fs.writeFileSync).mockImplementation(() => {
      throw new Error('診断HTMLを保存できません');
    });
    const sourceUrl = 'https://example.com/products/abc-123';
    const aiClient = createAiClient({
      text: `\`\`\`json\n${JSON.stringify(metadata)}\n\`\`\``,
      candidates: [{
        groundingMetadata: {
          groundingChunks: [{ web: {} }, { web: { uri: sourceUrl } }],
        },
      }],
    });

    const result = await GeminiSearchService.fetchMetadataWithGeminiSearch('abc-123', aiClient);

    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(result.title).toBe(metadata.title);
    expect(result.debug.finalUrl).toBe(sourceUrl);
    expect(result.debug.htmlPreview).toContain(sourceUrl);
  });
});

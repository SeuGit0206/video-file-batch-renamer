import fs from 'fs';
import { Type } from '@google/genai';
import type { GoogleGenAI } from '@google/genai';
import type { ScrapedMetadata } from '../types';
import { MISSAV_JA_BASE_URL } from '../constants';
import { LoggingService } from './LoggingService';

/**
 * Gemini API の Google 検索グラウンディング機能を利用したフォールバック用検索サービス
 */
export class GeminiSearchService {
  /**
   * Gemini 3.5 Flash を使用して Web 検索 grounding からメタデータを検索・取得
   */
  public static async fetchMetadataWithGeminiSearch(
    productId: string,
    aiClient: GoogleGenAI
  ): Promise<ScrapedMetadata> {
    const cleanId = productId.toUpperCase();
    const prompt = `Please search the web to find the real, accurate metadata for the JAV video with ID "${cleanId}".
Retrieve the following information:
1. The exact original Japanese title of the video on MissAV or original manufacturer/label sites (do not translate or guess, search for the real title).
2. The real Japanese name of the main actress or actresses.
3. The real release date (MUST be in YYYY-MM-DD format).
4. The series or studio name (e.g., "エスワン専属", "PRESTIGE", "IDEA POCKET", etc.).

Only return the actual real-world data from your search grounding. Do not generate fake or mock data.`;

    LoggingService.getInstance().info(`[Gemini Search Grounding] Querying metadata for ${cleanId}...`);

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'The exact original Japanese title of the video. Keep it original, do not translate.' },
            actress: { type: Type.STRING, description: 'The Japanese name of the actress or actresses. If multiple, separate with commas.' },
            releaseDate: { type: Type.STRING, description: 'The actual release date in YYYY-MM-DD format only.' },
            series: { type: Type.STRING, description: 'The series, studio, or publisher name.' }
          },
          required: ['title', 'actress', 'releaseDate', 'series']
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini returned an empty response.');
    }

    LoggingService.getInstance().info(`[Gemini Search Grounding] Raw response: ${text}`);

    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.substring(7);
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.substring(3);
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.substring(0, cleanedText.length - 3);
    }
    cleanedText = cleanedText.trim();

    const parsed = JSON.parse(cleanedText);

    // Extract grounding chunks for debug/logging info
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = chunks ? chunks.map((c: { web?: { uri?: string } }) => c.web?.uri).filter((uri): uri is string => Boolean(uri)) : [];
    const finalUrl = sources[0] || `${MISSAV_JA_BASE_URL}/${cleanId.toLowerCase()}`;

    // Save fake-compatible debug html for parity
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${parsed.title}</title>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "VideoObject",
              "name": "${parsed.title}",
              "uploadDate": "${parsed.releaseDate}",
              "actor": {
                "@type": "Person",
                "name": "${parsed.actress}"
              }
            }
          </script>
        </head>
        <body>
          <h1>${parsed.title}</h1>
          <p>Actress: ${parsed.actress}</p>
          <p>Release Date: ${parsed.releaseDate}</p>
          <video></video>
        </body>
      </html>
    `;
    try {
      fs.writeFileSync('save-debug.html', mockHtml.trim(), 'utf-8');
    } catch {
      // Ignore file write errors
    }

    return {
      productId: cleanId,
      title: parsed.title,
      actress: parsed.actress,
      releaseDate: parsed.releaseDate,
      series: parsed.series || 'MissAV',
      debug: {
        finalUrl,
        pageTitle: parsed.title,
        htmlLength: mockHtml.length,
        htmlPreview: `Retrieved via Gemini Search Grounding. Sources: ${sources.slice(0, 3).join(', ')}`,
        bodyPreview: `Title: ${parsed.title}\nActress: ${parsed.actress}\nDate: ${parsed.releaseDate}`,
        titleTag: `<title>${parsed.title}</title>`,
        matchedSelectors: ['h1', 'video', 'script[type="application/ld+json"]'],
        unmatchedSelectors: [],
        hasNextData: false,
        hasLdJson: true,
        hasVideo: true
      }
    };
  }
}

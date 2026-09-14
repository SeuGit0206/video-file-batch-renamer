import { AppErrorCode } from '../errors/AppErrorCodes';
import { ScraperError } from '../errors/ScraperError';
import type { ScrapedMetadata, ScraperDebugInfo } from '../types/scraper';

interface MetadataApiResponseBody {
  error?: string;
  errorCode?: string;
  data?: ScrapedMetadata;
  debug?: ScraperDebugInfo;
}

export async function parseMetadataApiResponse(response: Response): Promise<ScrapedMetadata> {
  let body: MetadataApiResponseBody | null = null;
  try {
    body = await response.json() as MetadataApiResponseBody;
  } catch {
    // HTTP status below supplies the useful error when the response is not JSON.
  }

  if (!response.ok) {
    throw new ScraperError(body?.error || `HTTP ${response.status}: メタデータ取得失敗`, {
      status: response.status,
      code: (body?.errorCode as AppErrorCode | undefined)
        || (response.status === 404 ? AppErrorCode.METADATA_NOT_FOUND : undefined),
      debug: body?.debug,
    });
  }

  if (body?.error || !body?.data) {
    throw new ScraperError(body?.error || 'メタデータが見つかりませんでした', {
      status: 404,
      code: (body?.errorCode as AppErrorCode | undefined) || AppErrorCode.METADATA_NOT_FOUND,
      debug: body?.debug,
    });
  }

  return body.data;
}

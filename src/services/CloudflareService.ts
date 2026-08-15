import { CLOUDFLARE_TITLE_MARKERS, CLOUDFLARE_BODY_MARKERS, HTTP_STATUS } from '../constants';

/**
 * Cloudflare チャレンジやアクセ制限のマーカー検出を行うサービス
 */
export class CloudflareService {
  /**
   * ページタイトル、HTML本文、HTTPステータスから Cloudflare ブロック検知の理由リストを返却
   */
  public static checkCloudflare(pageTitle: string, htmlContent: string, httpStatus?: number): string[] {
    const reasons: string[] = [];
    const title = (pageTitle || '').trim();
    const tLower = title.toLowerCase();
    const content = htmlContent || '';
    const cLower = content.toLowerCase();

    // 1. Title checks
    if (CLOUDFLARE_TITLE_MARKERS.some(marker => tLower.includes(marker)) || !title) {
      reasons.push(`Title = ${title || '(Empty)'}`);
    }

    // 2. HTTP Status checks
    if (httpStatus === HTTP_STATUS.FORBIDDEN || httpStatus === HTTP_STATUS.SERVICE_UNAVAILABLE) {
      if (CLOUDFLARE_BODY_MARKERS.some(marker => cLower.includes(marker))) {
        reasons.push(`HTTP Status ${httpStatus} with Cloudflare markers`);
      }
    }

    // 3. Content checks
    if (CLOUDFLARE_BODY_MARKERS.some(marker => cLower.includes(marker))) {
      reasons.push('Cloudflare specific markers detected in body HTML');
    }

    return reasons;
  }
}

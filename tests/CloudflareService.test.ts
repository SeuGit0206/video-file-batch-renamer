import { describe, expect, it } from 'vitest';
import { CloudflareService } from '../src/services/CloudflareService';

describe('CloudflareService', () => {
  it('タイトルが空の場合はCloudflare疑いの理由を返す', () => {
    const reasons = CloudflareService.checkCloudflare('', '<html><body>通常ページ</body></html>', 200);

    expect(reasons).toEqual(['Title = (Empty)']);
  });

  it('HTTP 403とCloudflare本文が揃う場合はHTTPと本文の理由を返す', () => {
    const reasons = CloudflareService.checkCloudflare(
      'Access denied',
      '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>',
      403
    );

    expect(reasons).toEqual(expect.arrayContaining([
      expect.stringContaining('HTTP Status 403'),
      expect.stringContaining('body HTML'),
    ]));
    expect(reasons).toHaveLength(2);
  });

  it('HTTP 503とCloudflare本文が揃う場合もHTTPと本文の理由を返す', () => {
    const reasons = CloudflareService.checkCloudflare(
      'Service temporarily unavailable',
      '<form id="challenge-form">確認中です</form>',
      503
    );

    expect(reasons).toEqual(expect.arrayContaining([
      expect.stringContaining('HTTP Status 503'),
      expect.stringContaining('body HTML'),
    ]));
    expect(reasons).toHaveLength(2);
  });

  it('通常のHTTP 200ページをCloudflareと誤検出しない', () => {
    const reasons = CloudflareService.checkCloudflare(
      'ABC-123 商品ページ',
      '<html><body><h1>商品情報</h1></body></html>',
      200
    );

    expect(reasons).toEqual([]);
  });

  it('タイトル・HTTP状態・本文マーカーをそれぞれ独立した条件として判定する', () => {
    const titleOnly = CloudflareService.checkCloudflare('JUST A MOMENT...', '<p>通常本文</p>', 200);
    const statusOnly = CloudflareService.checkCloudflare('通常ページ', '<p>通常本文</p>', 503);
    const bodyOnly = CloudflareService.checkCloudflare('通常ページ', '<div class="cf-challenge"></div>', 200);

    expect(titleOnly).toEqual([expect.stringContaining('Title =')]);
    expect(statusOnly).toEqual([]);
    expect(bodyOnly).toEqual(['Cloudflare specific markers detected in body HTML']);
  });
});

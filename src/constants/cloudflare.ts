/**
 * Cloudflare 判定・マーカーに関連する定数定義
 */

export const CLOUDFLARE_TITLE_MARKERS = [
  'just a moment',
  'cloudflare',
  'attention required',
] as const;

export const CLOUDFLARE_BODY_MARKERS = [
  'cf-challenge',
  'challenge-form',
  'cf-turnstile',
  'turnstile',
  'challenges.cloudflare.com',
  'cf-browser-verification',
] as const;

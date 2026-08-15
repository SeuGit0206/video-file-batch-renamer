/**
 * Playwrightおよびブラウザ制御に関連する定数定義
 */

export const DEFAULT_PORT = 3000;

export const DEFAULT_VIEWPORT = {
  width: 1280,
  height: 720,
} as const;

export const DEFAULT_LOCALE = 'ja-JP';
export const DEFAULT_TIMEZONE = 'Asia/Tokyo';

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export const DEFAULT_SEC_CH_UA_HEADERS = {
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
} as const;

export const PLAYWRIGHT_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--disable-gpu',
  '--disable-blink-features=AutomationControlled',
  '--disable-infobars',
  '--window-position=0,0',
  '--ignore-certificate-errors',
  '--ignore-certificate-errors-spki-list',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-web-security',
  '--disable-features=IsolateOrigins,site-per-process',
] as const;

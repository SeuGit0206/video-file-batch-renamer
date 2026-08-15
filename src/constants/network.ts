/**
 * ネットワークおよびHTTP通信に関連する定数定義
 */

export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const MISSAV_BASE_URL = 'https://missav.ai';
export const MISSAV_JA_BASE_URL = 'https://missav.ai/ja';

export const USER_AGENT_AISTUDIO = 'aistudio-build';

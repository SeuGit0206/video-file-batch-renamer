/**
 * ファイルパス・ディレクトリ構造に関連する定数定義
 */

export const PLAYWRIGHT_CACHE_DIR_NAME = '.playwright-cache';
export const LOGS_DIR_NAME = 'logs';
export const HTML_LOGS_DIR_NAME = 'logs/html';
export const USER_DATA_DIR_NAME = 'userdata';

export const COOKIES_FILE_PATH = 'logs/cookies.json';
export const STORAGE_STATE_FILE_PATH = 'logs/storageState.json';
export const ERROR_LOG_FILE_PATH = 'logs/error.log';

/**
 * Windows ファイルシステム制約に関連する定数
 */
export const WINDOWS_INVALID_CHARS_REGEX = /[\\/:*?"<>|]/;
export const WINDOWS_RESERVED_NAMES_REGEX = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?$/i;
export const WINDOWS_INVALID_END_CHARS_REGEX = /[. ]$/;

/**
 * ファイル名・ディレクトリ名の最大長制約 (Windows MAX_PATH / NTFS 単体ファイル長 255 安全マージン)
 */
export const WINDOWS_MAX_FILENAME_LENGTH = 250;
export const WINDOWS_MAX_SEGMENT_LENGTH = 240;

import { describe, expect, it } from 'vitest';
import {
  assertIsRecord,
  getErrorMessage,
  isBrowserMissingError,
  isErrorWithMessage,
  isRecord,
  isScrapedMetadata,
  isScraperCustomError,
  isScraperErrorResponse,
  isStringArray,
} from '../src/types/guards';

describe('型ガード', () => {
  it('通常オブジェクトだけをRecordとして受け入れ、assertionも同じ境界を使う', () => {
    expect(isRecord({ key: 'value' })).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);

    expect(() => assertIsRecord({ key: 'value' })).not.toThrow();
    expect(() => assertIsRecord([], '配列は使用できません')).toThrow('配列は使用できません');
  });

  it('Errorと文字列messageを持つオブジェクトから安全にメッセージを取得する', () => {
    const nativeError = new Error('通信失敗');
    const objectError = { message: '保存失敗' };

    expect(isErrorWithMessage(nativeError)).toBe(true);
    expect(isErrorWithMessage(objectError)).toBe(true);
    expect(isErrorWithMessage({ message: 500 })).toBe(false);
    expect(isErrorWithMessage(null)).toBe(false);
    expect(getErrorMessage(nativeError)).toBe('通信失敗');
    expect(getErrorMessage(objectError)).toBe('保存失敗');
    expect(getErrorMessage(null)).toBe('null');
  });

  it('ブラウザ不足とスクレイパー例外を必要な特徴から判定する', () => {
    expect(isBrowserMissingError({ isBrowserMissing: true })).toBe(true);
    expect(isBrowserMissingError({ isBrowserMissing: 'true' })).toBe(false);
    expect(isBrowserMissingError(null)).toBe(false);

    expect(isScraperCustomError(new Error('取得失敗'))).toBe(true);
    expect(isScraperCustomError({ status: 404 })).toBe(true);
    expect(isScraperCustomError({ debug: {} })).toBe(true);
    expect(isScraperCustomError({ message: '通常エラー' })).toBe(false);
    expect(isScraperCustomError(null)).toBe(false);
  });

  it('完全なエラー応答とメタデータだけを受け入れる', () => {
    const validError = { error: 'Not Found', details: 'ABC-123', status: 404, debug: {} };
    expect(isScraperErrorResponse(validError)).toBe(true);
    expect(isScraperErrorResponse({ ...validError, error: 404 })).toBe(false);
    expect(isScraperErrorResponse({ ...validError, details: null })).toBe(false);
    expect(isScraperErrorResponse({ ...validError, status: '404' })).toBe(false);
    expect(isScraperErrorResponse({ ...validError, debug: null })).toBe(false);
    expect(isScraperErrorResponse(null)).toBe(false);

    expect(isScrapedMetadata({ productId: 'ABC-123', debug: {} })).toBe(true);
    expect(isScrapedMetadata({ debug: {} })).toBe(false);
    expect(isScrapedMetadata({ productId: 123, debug: {} })).toBe(false);
    expect(isScrapedMetadata({ productId: 'ABC-123', debug: null })).toBe(false);
    expect(isScrapedMetadata(null)).toBe(false);
    expect(isScrapedMetadata([])).toBe(false);
  });

  it('文字列だけの配列と空配列を受け入れ、不正な要素や配列以外を拒否する', () => {
    expect(isStringArray(['A', 'B'])).toBe(true);
    expect(isStringArray([])).toBe(true);
    expect(isStringArray(['A', 1])).toBe(false);
    expect(isStringArray('A')).toBe(false);
  });
});

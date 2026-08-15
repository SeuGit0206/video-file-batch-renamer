import { describe, it, expect } from 'vitest';
import { ErrorResponseFactory } from '../src/factories/ErrorResponseFactory';
import { ScraperError } from '../src/errors';
import { HTTP_STATUS, MISSAV_JA_BASE_URL } from '../src/constants';

describe('ErrorResponseFactory', () => {
  const factory = new ErrorResponseFactory();

  describe('createErrorResponse', () => {
    it('ScraperError (例: 404) から適切な statusCode と ErrorResponseBody を生成する', () => {
      const customDebug = {
        finalUrl: 'https://missav.ai/ja/abc-123',
        pageTitle: 'Not Found Page',
        htmlLength: 100,
        htmlPreview: '<html></html>',
        bodyPreview: 'Not found',
        status: 404,
      };
      const scraperError = new ScraperError('Resource not found', {
        status: HTTP_STATUS.NOT_FOUND,
        debug: customDebug,
      });

      const result = factory.createErrorResponse(scraperError, 'ABC-123');

      expect(result.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
      expect(result.body.error).toBe('Resource not found');
      expect(result.body.details).toBe('Resource not found');
      expect(result.body.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(result.body.debug).toEqual(customDebug);
    });

    it('通常の Error オブジェクトの場合、デフォルトの 500 エラー構造と debug を生成する', () => {
      const error = new Error('Unexpected database fail');

      const result = factory.createErrorResponse(error, 'XYZ-999');

      expect(result.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(result.body.error).toBe('Unexpected database fail');
      expect(result.body.details).toBe('Unexpected database fail');
      expect(result.body.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(result.body.debug).toEqual({
        finalUrl: `${MISSAV_JA_BASE_URL}/xyz-999`,
        pageTitle: 'Scraping Failed',
        htmlLength: 0,
        htmlPreview: 'Unexpected database fail',
        bodyPreview: 'Unexpected database fail',
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      });
    });

    it('文字列または unknown エラーの場合も正しく処理する', () => {
      const result = factory.createErrorResponse('String error message', 'DEF-456');

      expect(result.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(result.body.error).toBe('String error message');
      expect(result.body.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  describe('create404ErrorResponse', () => {
    it('404 エラーレスポンスを正しく生成する', () => {
      const response = factory.create404ErrorResponse('ABC-123', 'Custom 404 message');

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.error).toBe('Custom 404 message');
      expect(response.details).toBe('Custom 404 message');
      expect(response.debug.finalUrl).toBe(`${MISSAV_JA_BASE_URL}/abc-123`);
    });
  });

  describe('create500ErrorResponse', () => {
    it('500 エラーレスポンスを正しく生成する', () => {
      const response = factory.create500ErrorResponse('ABC-123', 'Custom 500 message');

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.error).toBe('Custom 500 message');
      expect(response.details).toBe('Custom 500 message');
      expect(response.debug.finalUrl).toBe(`${MISSAV_JA_BASE_URL}/abc-123`);
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import {
  SecurityHeadersProvider,
  InputSanitizer,
  OutputSanitizer,
  HeaderSanitizer,
} from '../src/security';
import { RequestValidator, ValidationError, ValidationMiddleware } from '../src/validation';
import { SecurityMiddleware } from '../src/middleware';
import type { ScrapedMetadata } from '../src/types';

describe('Phase34 Advanced Security & Validation Layer Suite', () => {
  describe('SecurityHeadersProvider', () => {
    it('必要なセキュリティヘッダー（CSP, CORS, HSTS, XSS, Nosniff等）を生成・適用できること', () => {
      const provider = new SecurityHeadersProvider();
      const headers = provider.getHeaders();

      expect(headers['Content-Security-Policy']).toBeDefined();
      expect(headers['Access-Control-Allow-Origin']).toBe('*');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['Strict-Transport-Security']).toBeDefined();

      const mockSetHeader = vi.fn();
      const mockRes = { setHeader: mockSetHeader } as unknown as Response;

      provider.applyHeaders(mockRes);
      expect(mockSetHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });
  });

  describe('InputSanitizer', () => {
    it('HTMLタグやスクリプト、ヌルバイトを無害化・サニタイズできること', () => {
      const sanitizer = new InputSanitizer();

      const maliciousStr = "  <script>alert('xss')</script>Hello & World\0  ";
      const sanitized = sanitizer.sanitizeString(maliciousStr);
      expect(sanitized).toBe('Hello &amp; World');

      const obj = {
        name: "<script>eval('bad')</script>John",
        nested: { value: "<a href='javascript:void(0)'>Click</a>" },
      };
      const sanitizedObj = sanitizer.sanitizeObject(obj);
      expect(sanitizedObj.name).toBe('John');
      expect(sanitizedObj.nested.value).toBe('&lt;a href=&#x27;void(0)&#x27;&gt;Click&lt;/a&gt;');
    });
  });

  describe('OutputSanitizer', () => {
    it('レスポンス・ScrapedMetadata の危険要素を無害化できること', () => {
      const sanitizer = new OutputSanitizer();

      const rawMetadata = {
        productId: 'ABC-123',
        title: "Sample Video <script>alert('xss')</script>",
        artist: 'Director <img src=x onerror=alert(1)>',
        code: 'ABC-123',
        genres: ['Drama<script>', 'Action'],
      } as unknown as ScrapedMetadata;

      const clean = sanitizer.sanitizeMetadata(rawMetadata) as unknown as Record<string, unknown>;
      expect(clean.title).toBe('Sample Video');
      expect(clean.artist).toBe('Director img src=x onerror=alert(1)');
      expect(clean.genres).toEqual(['Drama', 'Action']);
    });
  });

  describe('HeaderSanitizer', () => {
    it('CRLF インジェクション文字 (\\r, \\n, \\0) を除去できること', () => {
      const sanitizer = new HeaderSanitizer();

      const taintedValue = 'value\r\nSet-Cookie: admin=true\0';
      const cleanValue = sanitizer.sanitizeHeaderValue(taintedValue);

      expect(cleanValue).toBe('valueSet-Cookie: admin=true');
    });
  });

  describe('RequestValidator', () => {
    it('正常なID文字列をバリデーションし大文字化して返すこと', () => {
      const validator = new RequestValidator();
      expect(validator.validateMetadataRequest(' abc-123 ')).toBe('ABC-123');
    });

    it('不正なID形式や長さ制限違反で ValidationError をスローすること', () => {
      const validator = new RequestValidator();

      expect(() => validator.validateMetadataRequest('')).toThrow(ValidationError);
      expect(() => validator.validateMetadataRequest('INVALID VALUE WITH SPACES!')).toThrow(ValidationError);
      expect(() => validator.validateMetadataRequest('A'.repeat(51))).toThrow(ValidationError);
    });
  });

  describe('ValidationMiddleware & SecurityMiddleware Integration', () => {
    it('SecurityMiddleware がヘッダー適用およびサイズ上限チェックを行うこと', () => {
      const secMiddleware = new SecurityMiddleware(undefined, undefined, undefined, {
        maxPayloadSizeBytes: 100,
      });

      const reqHeaders = { headers: { 'content-length': '200' } } as unknown as Request;
      const statusFn = vi.fn().mockReturnThis();
      const jsonFn = vi.fn();
      const res = { status: statusFn, json: jsonFn } as unknown as Response;
      const next = vi.fn();

      secMiddleware.enforcePayloadLimit()(reqHeaders, res, next);
      expect(statusFn).toHaveBeenCalledWith(413);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 'PAYLOAD_TOO_LARGE' }) })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('ValidationMiddleware が入力サニタイズを実行し next を呼び出すこと', () => {
      const middleware = new ValidationMiddleware();
      const req = {
        body: { title: "<script>alert('xss')</script>Test" },
        query: {},
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      middleware.sanitizeInput()(req, res, next);
      expect(req.body.title).toBe('Test');
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});

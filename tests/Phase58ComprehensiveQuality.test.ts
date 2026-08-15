import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InputSanitizer } from '../src/security/InputSanitizer';
import { OutputSanitizer } from '../src/security/OutputSanitizer';
import { HeaderSanitizer } from '../src/security/HeaderSanitizer';
import { RequestValidator, ValidationError } from '../src/validation/RequestValidator';
import { MemoryCacheAdapter } from '../src/cache/MemoryCacheAdapter';
import { ErrorLogService } from '../src/services/ErrorLogService';
import { LoggingService } from '../src/services/LoggingService';
import type { ScrapedMetadata } from '../src/types';
import fs from 'fs';

describe('Phase 58: Security, Validation, and Robustness Comprehensive Tests', () => {
  // ----------------------------------------------------
  // 1. Security & Sanitization Tests
  // ----------------------------------------------------
  describe('InputSanitizer Edge & Boundary Cases', () => {
    let sanitizer: InputSanitizer;

    beforeEach(() => {
      sanitizer = new InputSanitizer();
    });

    it('should handle non-string inputs safely', () => {
      expect(sanitizer.sanitizeString(null as unknown as string)).toBe('');
      expect(sanitizer.sanitizeString(undefined as unknown as string)).toBe('');
      expect(sanitizer.sanitizeString(12345 as unknown as string)).toBe('');
    });

    it('should sanitize null bytes and multiple script tags', () => {
      const dirty = 'Hello\0World<script>alert("xss")</script><script>console.log(1)</script>';
      const clean = sanitizer.sanitizeString(dirty);
      expect(clean).not.toContain('\0');
      expect(clean).not.toContain('<script>');
      expect(clean).toBe('HelloWorld');
    });

    it('should sanitize event handlers and javascript: URIs', () => {
      const dirty = '<a href="javascript:alert(1)" onclick="doBadThing()">Click</a>';
      const clean = sanitizer.sanitizeString(dirty);
      expect(clean).not.toContain('javascript:');
      expect(clean).not.toContain('onclick=');
      expect(clean).toContain('&lt;a href=&quot;');
      expect(clean).toContain('&gt;Click&lt;/a&gt;');
    });

    it('should recursively sanitize deeply nested objects and arrays', () => {
      const input = {
        name: '  <script>evil()</script>John\0  ',
        tags: ['<b onclick="alert(1)">tag1</b>', 'tag2\0'],
        nested: {
          key: 'value&test',
        },
      };

      const result = sanitizer.sanitizeObject(input);
      expect(result.name).toBe('John');
      expect(result.tags[0]).toBe('&lt;b &gt;tag1&lt;/b&gt;');
      expect(result.tags[1]).toBe('tag2');
      expect(result.nested.key).toBe('value&amp;test');
    });

    it('should handle null/undefined/primitives in sanitizeObject without throwing', () => {
      expect(sanitizer.sanitizeObject(null)).toBeNull();
      expect(sanitizer.sanitizeObject(undefined)).toBeUndefined();
      expect(sanitizer.sanitizeObject(123)).toBe(123);
      expect(sanitizer.sanitizeObject(true)).toBe(true);
    });
  });

  describe('OutputSanitizer Edge Cases', () => {
    let sanitizer: OutputSanitizer;

    beforeEach(() => {
      sanitizer = new OutputSanitizer();
    });

    it('should sanitize ScrapedMetadata with optional fields present or missing', () => {
      const rawMetadata = {
        productId: 'ABC-123',
        title: '  <script>alert("xss")</script> Sample Movie  ',
        artist: '<b>Artist Name</b>',
        code: 'ABC-123',
        genres: ['Action<script></script>', 'Drama'],
      } as unknown as ScrapedMetadata;

      const clean = sanitizer.sanitizeMetadata(rawMetadata) as unknown as Record<string, unknown>;
      expect(clean.title).toBe('Sample Movie');
      expect(clean.artist).toBe('bArtist Name/b');
      expect(clean.code).toBe('ABC-123');
      expect(clean.genres).toEqual(['Action', 'Drama']);
      expect(clean.actresses).toBeUndefined();
      expect(clean.label).toBeUndefined();
    });

    it('should sanitize general nested objects in OutputSanitizer.sanitize', () => {
      const data = {
        title: '<script>bad()</script>Test',
        num: 42,
        list: ['<p>Item</p>'],
      };

      const result = sanitizer.sanitize(data);
      expect(result.title).toBe('Test');
      expect(result.num).toBe(42);
      expect(result.list).toEqual(['pItem/p']);
    });
  });

  describe('HeaderSanitizer Boundary Tests', () => {
    let sanitizer: HeaderSanitizer;

    beforeEach(() => {
      sanitizer = new HeaderSanitizer();
    });

    it('should strip CRLF injection and null bytes from header values', () => {
      const maliciousHeader = 'application/json\r\nX-Injected-Header: evil\0';
      const clean = sanitizer.sanitizeHeaderValue(maliciousHeader);
      expect(clean).toBe('application/jsonX-Injected-Header: evil');
      expect(clean).not.toContain('\r');
      expect(clean).not.toContain('\n');
      expect(clean).not.toContain('\0');
    });

    it('should sanitize key-value pairs in header objects and omit empty keys', () => {
      const headers = {
        'Content-Type\r\n': 'text/html\n',
        '\r\n': 'invalid-key',
        'X-Valid-Key': '  valid-value  ',
      };

      const clean = sanitizer.sanitizeHeaders(headers);
      expect(clean['Content-Type']).toBe('text/html');
      expect(clean['\r\n']).toBeUndefined();
      expect(clean['X-Valid-Key']).toBe('valid-value');
    });
  });

  // ----------------------------------------------------
  // 2. Input Validation & Request Validation Tests
  // ----------------------------------------------------
  describe('RequestValidator Boundary & Exception Tests', () => {
    let validator: RequestValidator;

    beforeEach(() => {
      validator = new RequestValidator();
    });

    it('should accept valid product IDs', () => {
      expect(validator.validateMetadataRequest('abc-123')).toBe('ABC-123');
      expect(validator.validateMetadataRequest('FC2-PPV-102934')).toBe('FC2-PPV-102934');
      expect(validator.validateMetadataRequest('  ipx_521  ')).toBe('IPX_521');
    });

    it('should throw ValidationError on non-string or empty input', () => {
      expect(() => validator.validateMetadataRequest(null)).toThrow(ValidationError);
      expect(() => validator.validateMetadataRequest(undefined)).toThrow(ValidationError);
      expect(() => validator.validateMetadataRequest('')).toThrow(ValidationError);
      expect(() => validator.validateMetadataRequest('   ')).toThrow(ValidationError);
    });

    it('should throw ValidationError when ID length exceeds 50 characters', () => {
      const longId = 'A'.repeat(51);
      expect(() => validator.validateMetadataRequest(longId)).toThrow(ValidationError);
      expect(() => validator.validateMetadataRequest(longId)).toThrow(/maximum allowed length/i);
    });

    it('should throw ValidationError on forbidden characters (e.g. spaces, symbols, script tags)', () => {
      expect(() => validator.validateMetadataRequest('ABC 123')).toThrow(ValidationError);
      expect(() => validator.validateMetadataRequest('ABC-123!')).toThrow(ValidationError);
      expect(() => validator.validateMetadataRequest('<script>')).toThrow(ValidationError);
      expect(() => validator.validateMetadataRequest('../../etc/passwd')).toThrow(ValidationError);
    });

    it('should validate custom objects using schema rules in validateObject', () => {
      interface CustomDto {
        name: string;
        age: number;
      }

      const rules = [
        {
          field: 'name',
          validate: (v: unknown) => typeof v === 'string' && v.length > 0,
          message: 'Name is required',
        },
        {
          field: 'age',
          validate: (v: unknown) => typeof v === 'number' && v >= 0,
          message: 'Age must be non-negative',
        },
      ];

      const validObj = { name: 'Alice', age: 30 };
      expect(validator.validateObject<CustomDto>(validObj, rules)).toEqual(validObj);

      const invalidObj = { name: '', age: -5 };
      expect(() => validator.validateObject<CustomDto>(invalidObj, rules)).toThrow(ValidationError);
    });

    it('should throw ValidationError if data passed to validateObject is null or not an object', () => {
      expect(() => validator.validateObject(null, [])).toThrow(ValidationError);
      expect(() => validator.validateObject('string', [])).toThrow(ValidationError);
    });
  });

  // ----------------------------------------------------
  // 3. Cache Exceptional & Boundary Tests
  // ----------------------------------------------------
  describe('MemoryCacheAdapter Exceptional Scenarios', () => {
    let cache: MemoryCacheAdapter;

    beforeEach(() => {
      cache = new MemoryCacheAdapter(undefined, 100); // short default TTL (100ms) for testing
    });

    it('should return null for missing or expired keys', async () => {
      expect(await cache.get('nonexistent')).toBeNull();

      await cache.set('temp', { data: 1 }, 10); // 10ms TTL
      await new Promise((res) => setTimeout(res, 25));
      expect(await cache.get('temp')).toBeNull();
    });

    it('should handle zero or negative TTL gracefully', async () => {
      await cache.set('zero-ttl', 'value', 0);
      expect(await cache.get('zero-ttl')).toBe('value');

      await cache.set('neg-ttl', 'value', -100);
      expect(await cache.get('neg-ttl')).toBe('value');
    });

    it('should invalidate and clear cache items reliably', async () => {
      await cache.set('k1', 'v1');
      await cache.set('k2', 'v2');

      await cache.invalidate('k1');
      expect(await cache.get('k1')).toBeNull();
      expect(await cache.get('k2')).toBe('v2');

      await cache.clear();
      expect(await cache.get('k2')).toBeNull();
    });
  });

  // ----------------------------------------------------
  // 4. Error Logging Service Exceptional Handling
  // ----------------------------------------------------
  describe('ErrorLogService Robustness', () => {
    it('should log error messages without throwing when disk access fails or succeeds', () => {
      const spyError = vi.spyOn(LoggingService, 'error').mockImplementation(() => {});

      // Call saveErrorLog with a standard error
      const testError = new Error('Test Error Message');
      expect(() => ErrorLogService.saveErrorLog(testError)).not.toThrow();

      // Mock fs.appendFileSync to throw an error to test the catch block
      const fsSpy = vi.spyOn(fs, 'appendFileSync').mockImplementationOnce(() => {
        throw new Error('Disk Full');
      });

      ErrorLogService.saveErrorLog(testError);
      expect(spyError).toHaveBeenCalledWith('Failed to write to error.log:', 'Disk Full');

      fsSpy.mockRestore();
      spyError.mockRestore();
    });
  });
});

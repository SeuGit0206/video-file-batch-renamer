import { beforeEach, describe, expect, it } from 'vitest';
import { ImportStrategyFactory } from '../../../services/import/ImportStrategyFactory';
import { JsonImportService } from '../../../services/import/JsonImportService';
import { CsvImportService } from '../../../services/import/CsvImportService';
import type { IImportService } from '../../../services/import/IImportService';
import type { ImportFormat } from '../../../types/import';

describe('ImportStrategyFactory Unit Tests', () => {
  beforeEach(() => {
    ImportStrategyFactory.clearCache();
  });

  describe('Static getService method', () => {
    it('json 形式指定時に JsonImportService のインスタンスを取得できる', () => {
      const service = ImportStrategyFactory.getService('json');
      expect(service).toBeInstanceOf(JsonImportService);
      expect(service.format).toBe('json');
      expect(service.supportsTarget('history')).toBe(true);
    });

    it('csv 形式指定時に CsvImportService のインスタンスを取得できる', () => {
      const service = ImportStrategyFactory.getService('csv');
      expect(service).toBeInstanceOf(CsvImportService);
      expect(service.format).toBe('csv');
      expect(service.supportsTarget('logs')).toBe(true);
    });

    it('同じフォーマットで複数回呼び出した場合、同一のキャッシュ済みインスタンスが返される', () => {
      const service1 = ImportStrategyFactory.getService('json');
      const service2 = ImportStrategyFactory.getService('json');
      expect(service1).toBe(service2);
    });

    it('未対応のフォーマットを指定した場合にエラーが発生する', () => {
      const unsupportedFormat = 'xml' as unknown as ImportFormat;
      expect(() => ImportStrategyFactory.getService(unsupportedFormat)).toThrow(
        '未対応のインポートフォーマットです: xml'
      );
    });

    it('registerStrategy でカスタム Strategy を動的登録および取得できる', () => {
      const mockService: IImportService = {
        format: 'xml',
        async parse() {
          return {
            sourceFormat: 'xml',
            target: 'history',
            items: [],
          };
        },
        async validate() {
          return {
            isValid: true,
            errors: [],
            warnings: [],
            recordCount: 0,
          };
        },
        async importData() {
          return {
            success: true,
            target: 'history',
            format: 'xml',
            importedCount: 0,
            failedCount: 0,
            errors: [],
            warnings: [],
            timestamp: new Date().toISOString(),
          };
        },
        supportsTarget(t) {
          return t === 'history';
        },
      };

      ImportStrategyFactory.registerStrategy('xml', mockService);
      const service = ImportStrategyFactory.getService('xml');
      expect(service).toBe(mockService);
      expect(service.format).toBe('xml');
    });
  });

  describe('Instance-based Constructor & getStrategy', () => {
    it('コンストラクタで生成されたインスタンス経由で getStrategy が動作する', () => {
      const factory = new ImportStrategyFactory();
      const jsonService = factory.getStrategy('json');
      const csvService = factory.getStrategy('csv');

      expect(jsonService).toBeInstanceOf(JsonImportService);
      expect(csvService).toBeInstanceOf(CsvImportService);
    });

    it('カスタムサービス Map をコンストラクタに注入できる (DI対応)', () => {
      const customMap = new Map<ImportFormat, IImportService>();
      const customJson = new JsonImportService();
      customMap.set('json', customJson);

      const factory = new ImportStrategyFactory(customMap);
      expect(factory.getStrategy('json')).toBe(customJson);
      expect(() => factory.getStrategy('csv')).toThrow('未対応のインポートフォーマットです: csv');
    });
  });
});

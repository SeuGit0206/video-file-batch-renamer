import { describe, expect, it } from 'vitest';
import { CompositionRoot } from '../../../composition/CompositionRoot';
import { Container, container } from '../../../composition/container';
import { ImportStrategyFactory } from '../../../services/import/ImportStrategyFactory';
import { ImportValidationPolicy } from '../../../policies/ImportValidationPolicy';
import { JsonImportService } from '../../../services/import/JsonImportService';
import { CsvImportService } from '../../../services/import/CsvImportService';
import { ExportStrategyFactory } from '../../../services/export/ExportStrategyFactory';
import { StatisticsService } from '../../../services/statistics/StatisticsService';

describe('Import DI Container Unit Tests', () => {
  describe('Container (container.ts)', () => {
    it('DIコンテナインスタンスの生成に成功する', () => {
      const instance = Container.getInstance();
      expect(instance).toBeDefined();
      expect(container).toBe(instance);
    });

    it('ImportStrategyFactory を取得できる', () => {
      const factory = container.getImportStrategyFactory();
      expect(factory).toBe(ImportStrategyFactory);
      expect(container.importStrategyFactory).toBe(ImportStrategyFactory);
    });

    it('ImportValidationPolicy を取得できる', () => {
      const policy = container.getImportValidationPolicy();
      expect(policy).toBe(ImportValidationPolicy);
      expect(container.importValidationPolicy).toBe(ImportValidationPolicy);
    });

    it('JsonImportService を解決・取得確認できる', () => {
      const jsonServiceCls = container.getJsonImportService();
      expect(jsonServiceCls).toBe(JsonImportService);
      const serviceInstance = new jsonServiceCls();
      expect(serviceInstance).toBeInstanceOf(JsonImportService);
      expect(serviceInstance.format).toBe('json');
    });

    it('CsvImportService を解決・取得確認できる', () => {
      const csvServiceCls = container.getCsvImportService();
      expect(csvServiceCls).toBe(CsvImportService);
      const serviceInstance = new csvServiceCls();
      expect(serviceInstance).toBeInstanceOf(CsvImportService);
      expect(serviceInstance.format).toBe('csv');
    });

    it('既存の Export DI (ExportStrategyFactory, StatisticsService) が正常動作する', () => {
      expect(container.getExportStrategyFactory()).toBe(ExportStrategyFactory);
      expect(container.exportStrategyFactory).toBe(ExportStrategyFactory);
      expect(container.getStatisticsService()).toBe(StatisticsService);
      expect(container.statisticsService).toBe(StatisticsService);
    });
  });

  describe('CompositionRoot (CompositionRoot.ts)', () => {
    it('CompositionRoot から Import 関連依存関係と既存 Export DI が正常取得できる', () => {
      const root = CompositionRoot.getInstance();
      expect(root).toBeDefined();

      // Import 関連依存解決
      expect(root.getImportStrategyFactory()).toBe(ImportStrategyFactory);
      expect(root.getImportValidationPolicy()).toBe(ImportValidationPolicy);

      const JsonCls = root.getJsonImportService();
      expect(JsonCls).toBe(JsonImportService);
      expect(new JsonCls().format).toBe('json');

      const CsvCls = root.getCsvImportService();
      expect(CsvCls).toBe(CsvImportService);
      expect(new CsvCls().format).toBe('csv');

      // 既存 Export DI
      expect(root.getExportStrategyFactory()).toBe(ExportStrategyFactory);
      expect(root.getStatisticsService()).toBe(StatisticsService);
    });
  });
});

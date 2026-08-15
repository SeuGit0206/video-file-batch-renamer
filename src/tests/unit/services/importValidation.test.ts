import { describe, expect, it } from 'vitest';
import { ImportValidationPolicy } from '../../../policies/ImportValidationPolicy';
import type {
  ImportData,
  ImportOptions,
  ImportPreset,
  ImportRule,
} from '../../../types/import';

describe('ImportValidationPolicy Unit Tests', () => {
  describe('validateData', () => {
    it('正常な ImportData を正しく検証できる', () => {
      const validData: ImportData = {
        title: '正常データ',
        sourceFormat: 'json',
        target: 'history',
        items: [{ id: '1', name: 'アイテム1' }],
      };

      const result = ImportValidationPolicy.validateData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.recordCount).toBe(1);
    });

    it('非オブジェクトまたは null の場合エラーを返す', () => {
      const resultNull = ImportValidationPolicy.validateData(null);
      expect(resultNull.isValid).toBe(false);
      expect(resultNull.errors[0]).toContain('オブジェクトである必要があります');

      const resultStr = ImportValidationPolicy.validateData('invalid');
      expect(resultStr.isValid).toBe(false);
    });

    it('不正な sourceFormat の場合エラーを返す', () => {
      const invalidData = {
        sourceFormat: 'unknown_format',
        target: 'history',
        items: [],
      };

      const result = ImportValidationPolicy.validateData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('無効なソースフォーマット'))).toBe(true);
    });

    it('不正な ImportTarget の場合エラーを返す', () => {
      const invalidData = {
        sourceFormat: 'json',
        target: 'invalid_target',
        items: [],
      };

      const result = ImportValidationPolicy.validateData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('無効なインポートターゲット'))).toBe(true);
    });

    it('items が配列でない場合エラーを返す', () => {
      const invalidData = {
        sourceFormat: 'json',
        target: 'settings',
        items: 'not_an_array',
      };

      const result = ImportValidationPolicy.validateData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('配列である必要があります'))).toBe(true);
    });

    it('items 配列内に非オブジェクト要素がある場合エラーを返す', () => {
      const invalidData = {
        sourceFormat: 'json',
        target: 'settings',
        items: ['not_an_object', 123],
      };

      const result = ImportValidationPolicy.validateData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('レコード数が0件の場合は警告が発生するがデータとしては有効', () => {
      const emptyData: ImportData = {
        sourceFormat: 'csv',
        target: 'logs',
        items: [],
      };

      const result = ImportValidationPolicy.validateData(emptyData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('0件');
      expect(result.recordCount).toBe(0);
    });

    it('空のオブジェクト要素が含まれる場合に警告が発生する', () => {
      const dataWithEmptyObj: ImportData = {
        sourceFormat: 'json',
        target: 'presets',
        items: [{}],
      };

      const result = ImportValidationPolicy.validateData(dataWithEmptyObj);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('空のオブジェクト');
    });

    it('オプションとフォーマット/ターゲットが不一致の場合に警告が発生する', () => {
      const data: ImportData = {
        sourceFormat: 'json',
        target: 'history',
        items: [{ a: 1 }],
      };

      const options: Partial<ImportOptions> = {
        format: 'csv',
        target: 'metadata',
      };

      const result = ImportValidationPolicy.validateData(data, options);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(2);
    });

    it('複数エラーケースをまとめて抽出できる', () => {
      const multiErrorData = {
        sourceFormat: 'invalid_fmt',
        target: 'invalid_target',
        items: 'not_array',
      };

      const result = ImportValidationPolicy.validateData(multiErrorData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('境界値テスト: メタデータやタイトルが存在する場合と存在しない場合', () => {
      const dataWithMeta: ImportData = {
        title: 'タイトル',
        sourceFormat: 'json',
        target: 'history',
        items: [{ id: '1' }],
        metadata: { exportedBy: 'admin' },
      };

      const resMeta = ImportValidationPolicy.validateData(dataWithMeta);
      expect(resMeta.isValid).toBe(true);
      expect(resMeta.metadata).toEqual({ exportedBy: 'admin' });

      const dataWithoutMeta: ImportData = {
        sourceFormat: 'json',
        target: 'history',
        items: [{ id: '1' }],
      };

      const resNoMeta = ImportValidationPolicy.validateData(dataWithoutMeta);
      expect(resNoMeta.isValid).toBe(true);
      expect(resNoMeta.metadata).toBeUndefined();
    });
  });

  describe('validateOptions', () => {
    it('正常な ImportOptions を通過させる', () => {
      const validOpts: ImportOptions = {
        format: 'json',
        target: 'history',
        mode: 'merge',
      };

      const result = ImportValidationPolicy.validateOptions(validOpts);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('不正な ImportMode を検出する', () => {
      const invalidOpts = {
        format: 'json',
        target: 'history',
        mode: 'invalid_mode',
      };

      const result = ImportValidationPolicy.validateOptions(invalidOpts);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('無効または指定なしのモード');
    });

    it('Null または非オブジェクトの Options の検証', () => {
      const resultNull = ImportValidationPolicy.validateOptions(null);
      expect(resultNull.isValid).toBe(false);
      expect(resultNull.errors[0]).toContain('オブジェクトである必要があります');
    });
  });

  describe('validateRule', () => {
    it('正常な ImportRule を通過させる', () => {
      const rule: ImportRule = {
        id: 'r1',
        sourceField: 'old_field',
        targetField: 'new_field',
      };

      const result = ImportValidationPolicy.validateRule(rule);
      expect(result.isValid).toBe(true);
    });

    it('必須フィールドが空文字列の場合エラーを返す', () => {
      const invalidRule: ImportRule = {
        id: '',
        sourceField: '  ',
        targetField: 'new_field',
      };

      const result = ImportValidationPolicy.validateRule(invalidRule);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('Null または非オブジェクトの Rule の検証', () => {
      const resultNull = ImportValidationPolicy.validateRule(undefined);
      expect(resultNull.isValid).toBe(false);
      expect(resultNull.errors[0]).toContain('オブジェクトである必要があります');
    });
  });

  describe('validatePreset', () => {
    it('正常な ImportPreset を通過させる', () => {
      const preset: ImportPreset = {
        id: 'p1',
        name: 'プリセット1',
        format: 'json',
        target: 'settings',
        defaultMode: 'overwrite',
        rules: [
          {
            id: 'r1',
            sourceField: 'src',
            targetField: 'tgt',
          },
        ],
        createdAt: '2026-08-05T00:00:00Z',
        updatedAt: '2026-08-05T00:00:00Z',
      };

      const result = ImportValidationPolicy.validatePreset(preset);
      expect(result.isValid).toBe(true);
    });

    it('ルール内エラーを含むプリセットを不適格と判定する', () => {
      const invalidPreset = {
        id: 'p1',
        name: '不正プリセット',
        format: 'json',
        target: 'settings',
        defaultMode: 'overwrite',
        rules: [
          {
            id: '',
            sourceField: '',
            targetField: '',
          },
        ],
      };

      const result = ImportValidationPolicy.validatePreset(invalidPreset);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('ルール [0] が無効です'))).toBe(true);
    });
  });
});

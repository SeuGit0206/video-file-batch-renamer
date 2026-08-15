import { describe, expect, it } from 'vitest';
import type {
  ImportData,
  ImportFormat,
  ImportOptions,
  ImportResult,
  ImportTarget,
  ImportValidationResult,
  ImportPreset,
  ImportRule,
  ImportDiffInfo,
} from '../../../types/import';
import type { IImportService } from '../../../services/import/IImportService';

class MockImportService implements IImportService {
  readonly format: ImportFormat = 'json';

  async parse(content: string, _options?: Partial<ImportOptions>): Promise<ImportData> {
    const parsed = JSON.parse(content);
    return {
      title: parsed.title || 'Mock Import',
      sourceFormat: 'json',
      target: 'settings',
      items: parsed.items || [],
    };
  }

  async validate(data: ImportData, _options?: Partial<ImportOptions>): Promise<ImportValidationResult> {
    return {
      isValid: data.items.length > 0,
      errors: data.items.length === 0 ? ['データアイテムが存在しません'] : [],
      warnings: [],
      recordCount: data.items.length,
      diff: {
        totalChanges: 1,
        addedCount: 1,
        modifiedCount: 0,
        removedCount: 0,
        unchangedCount: 0,
      },
    };
  }

  async importData(data: ImportData, _options?: Partial<ImportOptions>): Promise<ImportResult> {
    return {
      success: true,
      target: data.target,
      format: this.format,
      importedCount: data.items.length,
      failedCount: 0,
      errors: [],
      warnings: [],
      timestamp: new Date().toISOString(),
    };
  }

  supportsTarget(target: ImportTarget): boolean {
    return target === 'settings' || target === 'presets';
  }
}

describe('Phase 63 Step 1 Import Contract & Types Test', () => {
  it('IImportService のモック実装が正しい契約を満たす', async () => {
    const service = new MockImportService();
    expect(service.format).toBe('json');
    expect(service.supportsTarget('settings')).toBe(true);
    expect(service.supportsTarget('logs')).toBe(false);

    const parseResult = await service.parse('{"title":"テスト","items":[{"key":"value"}]}');
    expect(parseResult.title).toBe('テスト');
    expect(parseResult.items.length).toBe(1);

    const valResult = await service.validate(parseResult);
    expect(valResult.isValid).toBe(true);
    expect(valResult.recordCount).toBe(1);

    const execResult = await service.importData(parseResult);
    expect(execResult.success).toBe(true);
    expect(execResult.importedCount).toBe(1);
  });

  it('ImportPreset と ImportRule の型構造が正しい', () => {
    const rule: ImportRule = {
      id: 'r1',
      sourceField: 'old_key',
      targetField: 'new_key',
      required: true,
      transform: 'trim',
    };

    const preset: ImportPreset = {
      id: 'p1',
      name: '設定インポートプリセット',
      format: 'json',
      target: 'settings',
      rules: [rule],
      defaultMode: 'merge',
      createdAt: '2026-08-05T00:00:00Z',
      updatedAt: '2026-08-05T00:00:00Z',
    };

    expect(preset.rules[0].transform).toBe('trim');
    expect(preset.defaultMode).toBe('merge');
  });

  it('ImportDiffInfo の型定義が正しい', () => {
    const diff: ImportDiffInfo = {
      totalChanges: 3,
      addedCount: 2,
      modifiedCount: 1,
      removedCount: 0,
      unchangedCount: 5,
      globalFields: [
        {
          field: 'renameTemplate',
          oldValue: '{title}',
          newValue: '{id}_{title}',
          status: 'modified',
        },
      ],
    };

    expect(diff.totalChanges).toBe(3);
    expect(diff.globalFields?.[0].status).toBe('modified');
  });
});

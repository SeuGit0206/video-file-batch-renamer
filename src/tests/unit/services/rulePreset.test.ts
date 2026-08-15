import { describe, it, expect, beforeEach } from 'vitest';
import { RulePresetService } from '../../../services/rule/RulePresetService';
import type { RulePreset, RuleDefinition } from '../../../types/rule';

describe('Phase64 Step4: RulePresetService Unit Test', () => {
  let presetService: RulePresetService;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    presetService = new RulePresetService();
  });

  const sampleRule: RuleDefinition = {
    id: 'rule-101',
    name: 'Sample Rule',
    enabled: true,
    priority: 1,
    conditionOperator: 'AND',
    conditions: [{ id: 'cond-1', field: 'title', operator: 'contains', value: 'video' }],
    actions: [{ id: 'act-1', type: 'replace', targetField: 'title', pattern: 'video', replacement: 'clip' }],
    createdAt: '2026-08-05T00:00:00Z',
    updatedAt: '2026-08-05T00:00:00Z',
  };

  const samplePreset: RulePreset = {
    presetId: 'preset-001',
    name: 'Video Naming Preset',
    description: 'Standard preset for video renaming',
    enabled: true,
    rules: [sampleRule],
    createdAt: '2026-08-05T00:00:00Z',
    updatedAt: '2026-08-05T00:00:00Z',
  };

  it('Presetの保存・取得が正常に行える', () => {
    const saveRes = presetService.savePreset(samplePreset);
    expect(saveRes.success).toBe(true);
    expect(saveRes.data?.presetId).toBe('preset-001');

    const getRes = presetService.getPreset('preset-001');
    expect(getRes.success).toBe(true);
    expect(getRes.data?.name).toBe('Video Naming Preset');
    expect(getRes.data?.rules).toHaveLength(1);
  });

  it('Presetの削除が正常に行える', () => {
    presetService.savePreset(samplePreset);
    const deleteRes = presetService.deletePreset('preset-001');
    expect(deleteRes.success).toBe(true);

    const getRes = presetService.getPreset('preset-001');
    expect(getRes.success).toBe(false);
    expect(getRes.error).toContain('not found');
  });

  it('複数のPresetを一覧取得できる', () => {
    const preset2: RulePreset = {
      ...samplePreset,
      presetId: 'preset-002',
      name: 'Audio Naming Preset',
    };

    presetService.savePreset(samplePreset);
    presetService.savePreset(preset2);

    const allRes = presetService.getPresets();
    expect(allRes.success).toBe(true);
    expect(allRes.data).toHaveLength(2);
  });

  it('不正なPreset定義（名前空欄やルール欠落など）を検出し拒否する', () => {
    const invalidPreset = {
      presetId: '',
      name: '',
      enabled: true,
      rules: null,
    } as unknown as RulePreset;

    const valRes = presetService.validatePreset(invalidPreset);
    expect(valRes.valid).toBe(false);
    expect(valRes.errors.length).toBeGreaterThan(0);

    const saveRes = presetService.savePreset(invalidPreset);
    expect(saveRes.success).toBe(false);
    expect(saveRes.error).toContain('Invalid preset format');
  });

  it('Ruleのpriority重複をバリデーションで検出する', () => {
    const rule2: RuleDefinition = {
      ...sampleRule,
      id: 'rule-102',
      name: 'Duplicate Priority Rule',
      priority: 1, // 同じ priority
    };

    const duplicatePreset: RulePreset = {
      ...samplePreset,
      rules: [sampleRule, rule2],
    };

    const valRes = presetService.validatePreset(duplicatePreset);
    expect(valRes.valid).toBe(false);
    expect(valRes.errors.some((err) => err.includes('Duplicate priority'))).toBe(true);
  });

  it('getEngineRulesFromPreset で RuleEngine 用の有効ルール一覧が取得できる', () => {
    const disabledRule: RuleDefinition = {
      ...sampleRule,
      id: 'rule-disabled',
      enabled: false,
      priority: 2,
    };

    const multiRulePreset: RulePreset = {
      ...samplePreset,
      rules: [sampleRule, disabledRule],
    };

    presetService.savePreset(multiRulePreset);

    const rulesRes = presetService.getEngineRulesFromPreset('preset-001');
    expect(rulesRes.success).toBe(true);
    expect(rulesRes.data).toHaveLength(1);
    expect(rulesRes.data?.[0].id).toBe('rule-101');
  });

  it('無効化されたPreset (enabled: false) からは空配列が取得される', () => {
    const disabledPreset: RulePreset = {
      ...samplePreset,
      enabled: false,
    };

    presetService.savePreset(disabledPreset);

    const rulesRes = presetService.getEngineRulesFromPreset('preset-001');
    expect(rulesRes.success).toBe(true);
    expect(rulesRes.data).toHaveLength(0);
  });
});

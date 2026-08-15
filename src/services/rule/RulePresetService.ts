import type {
  RulePreset,
  PresetValidationResult,
  PresetOperationResult,
  RuleDefinition,
} from '../../types/rule';
import type { IRulePresetService } from './IRulePresetService';
import { RuleEngine } from './RuleEngine';

const PRESETS_STORAGE_KEY = 'vrt_rule_presets';

export class RulePresetService implements IRulePresetService {
  private inMemoryPresets: Map<string, RulePreset> = new Map();
  private ruleEngine: RuleEngine;

  constructor(ruleEngine?: RuleEngine) {
    this.ruleEngine = ruleEngine ?? new RuleEngine();
  }

  /**
   * 保存されているすべてのプリセットを取得します
   */
  public getPresets(): PresetOperationResult<RulePreset[]> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return {
          success: true,
          data: Array.from(this.inMemoryPresets.values()),
        };
      }

      const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (!raw) {
        return { success: true, data: [] };
      }

      const parsed = JSON.parse(raw) as RulePreset[];
      if (!Array.isArray(parsed)) {
        return { success: true, data: [] };
      }

      return { success: true, data: parsed };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Failed to retrieve presets: ${message}`,
      };
    }
  }

  /**
   * IDでプリセットを取得します
   */
  public getPreset(presetId: string): PresetOperationResult<RulePreset> {
    if (!presetId) {
      return { success: false, error: 'presetId is required' };
    }

    const allRes = this.getPresets();
    if (!allRes.success || !allRes.data) {
      return { success: false, error: allRes.error ?? 'Preset not found' };
    }

    const preset = allRes.data.find((p) => p.presetId === presetId);
    if (!preset) {
      return { success: false, error: `Preset with id ${presetId} not found` };
    }

    return { success: true, data: preset };
  }

  /**
   * プリセットを保存（新規登録または更新）します
   */
  public savePreset(preset: RulePreset): PresetOperationResult<RulePreset> {
    const valRes = this.validatePreset(preset);
    if (!valRes.valid) {
      return {
        success: false,
        error: `Invalid preset format: ${valRes.errors.join('; ')}`,
      };
    }

    const allRes = this.getPresets();
    const currentPresets: RulePreset[] = allRes.success && allRes.data ? [...allRes.data] : [];


    const now = new Date().toISOString();
    const updatedPreset: RulePreset = {
      ...preset,
      createdAt: preset.createdAt || now,
      updatedAt: now,
    };

    const existingIndex = currentPresets.findIndex((p) => p.presetId === preset.presetId);
    if (existingIndex >= 0) {
      currentPresets[existingIndex] = updatedPreset;
    } else {
      currentPresets.push(updatedPreset);
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(currentPresets));
      } else {
        this.inMemoryPresets.set(updatedPreset.presetId, updatedPreset);
      }
      return { success: true, data: updatedPreset };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Failed to save preset: ${message}`,
      };
    }
  }

  /**
   * プリセットを削除します
   */
  public deletePreset(presetId: string): PresetOperationResult<void> {
    if (!presetId) {
      return { success: false, error: 'presetId is required' };
    }

    const allRes = this.getPresets();
    if (!allRes.success || !allRes.data) {
      return { success: false, error: allRes.error ?? 'Failed to delete preset' };
    }

    const filtered = allRes.data.filter((p) => p.presetId !== presetId);

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(filtered));
      } else {
        this.inMemoryPresets.delete(presetId);
      }
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Failed to delete preset: ${message}`,
      };
    }
  }

  /**
   * プリセット構造および内包するルールのバリデーションを行います
   */
  public validatePreset(preset: RulePreset): PresetValidationResult {
    const errors: string[] = [];

    if (!preset || typeof preset !== 'object') {
      return { valid: false, errors: ['Preset must be an object'] };
    }

    if (!preset.presetId || typeof preset.presetId !== 'string' || preset.presetId.trim() === '') {
      errors.push('presetId is required and must be a non-empty string');
    }

    if (!preset.name || typeof preset.name !== 'string' || preset.name.trim() === '') {
      errors.push('Preset name is required and must be a non-empty string');
    }

    if (!Array.isArray(preset.rules)) {
      errors.push('rules must be an array');
    } else {
      const priorities = new Set<number>();
      preset.rules.forEach((rule, idx) => {
        const ruleVal = this.ruleEngine.validateRule(rule);
        if (!ruleVal.valid) {
          errors.push(`Rule at index ${idx} ("${rule.name || 'unnamed'}") is invalid: ${ruleVal.errors.join(', ')}`);
        }

        if (typeof rule.priority === 'number') {
          if (priorities.has(rule.priority)) {
            errors.push(`Duplicate priority found: ${rule.priority} at rule index ${idx}`);
          }
          priorities.add(rule.priority);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * プリセットから RuleEngine で利用可能な RuleDefinition 配列を取得します
   */
  public getEngineRulesFromPreset(presetId: string): PresetOperationResult<RuleDefinition[]> {
    const presetRes = this.getPreset(presetId);
    if (!presetRes.success || !presetRes.data) {
      return { success: false, error: presetRes.error };
    }

    const preset = presetRes.data;
    if (!preset.enabled) {
      return { success: true, data: [] };
    }

    const activeRules = preset.rules.filter((r) => r.enabled);
    return { success: true, data: activeRules };
  }
}

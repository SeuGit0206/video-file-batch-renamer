import type {
  RulePreset,
  PresetValidationResult,
  PresetOperationResult,
  RuleDefinition,
} from '../../types/rule';

export interface IRulePresetService {
  /**
   * 保存されているすべてのプリセットを取得します
   */
  getPresets(): PresetOperationResult<RulePreset[]>;

  /**
   * IDでプリセットを取得します
   */
  getPreset(presetId: string): PresetOperationResult<RulePreset>;

  /**
   * プリセットを保存（新規登録または更新）します
   */
  savePreset(preset: RulePreset): PresetOperationResult<RulePreset>;

  /**
   * プリセットを削除します
   */
  deletePreset(presetId: string): PresetOperationResult<void>;

  /**
   * プリセット構造および内包するルールのバリデーションを行います
   */
  validatePreset(preset: RulePreset): PresetValidationResult;

  /**
   * プリセットから RuleEngine で利用可能な RuleDefinition 配列を取得します
   */
  getEngineRulesFromPreset(presetId: string): PresetOperationResult<RuleDefinition[]>;
}

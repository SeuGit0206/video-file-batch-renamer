import type {
  RuleDefinition,
  RuleExecutionResult,
  RuleEngineExecutionSummary,
  RuleEngineContext,
} from '../../types/rule';

export interface RuleValidationResult {
  valid: boolean;
  errors: string[];
}

export interface IRuleEngine {
  /**
   * 単一ルールが入力データに適合するか評価します
   */
  evaluateRule(rule: RuleDefinition, input: Record<string, unknown>): boolean;

  /**
   * 複数のルールを実行して入力データを変換します
   */
  execute(context: RuleEngineContext): RuleEngineExecutionSummary;

  /**
   * 単一ルールを実行して評価結果と変換後の値を取得します
   */
  executeSingleRule(rule: RuleDefinition, input: Record<string, unknown>): RuleExecutionResult;

  /**
   * ルール定義の構文・構造妥当性を検証します
   */
  validateRule(rule: RuleDefinition): RuleValidationResult;
}

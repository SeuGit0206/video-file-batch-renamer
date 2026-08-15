import type {
  RuleDefinition,
  RuleExecutionResult,
  RuleEngineExecutionSummary,
  RuleEngineContext,
} from '../../types/rule';
import type { IRuleEngine, RuleValidationResult } from './IRuleEngine';
import { RuleEvaluator } from './RuleEvaluator';

export class RuleEngine implements IRuleEngine {
  private evaluator: RuleEvaluator;

  constructor(evaluator?: RuleEvaluator) {
    this.evaluator = evaluator ?? new RuleEvaluator();
  }

  /**
   * 単一ルールが入力データに適合するか評価します
   */
  public evaluateRule(rule: RuleDefinition, input: Record<string, unknown>): boolean {
    if (!rule) return false;
    return this.evaluator.evaluateRule(rule, input);
  }

  /**
   * 単一ルールを実行して評価結果と変換後の値を取得します
   */
  public executeSingleRule(rule: RuleDefinition, input: Record<string, unknown>): RuleExecutionResult {
    if (!rule) {
      return {
        ruleId: 'unknown',
        ruleName: 'Unknown',
        applied: false,
        success: false,
        error: 'Rule definition is null or undefined',
        originalValue: input ?? {},
        newValue: input ?? {},
        before: input ?? {},
        after: input ?? {},
        changes: [],
        executionTimeMs: 0,
      };
    }
    return this.evaluator.executeRule(rule, input);
  }

  /**
   * 複数のルールを優先順位にしたがって順番に実行し、入力データを変換します
   */
  public execute(context: RuleEngineContext): RuleEngineExecutionSummary {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const input = JSON.parse(JSON.stringify(context?.input ?? {})) as Record<string, unknown>;
    let currentData = JSON.parse(JSON.stringify(input)) as Record<string, unknown>;

    if (!context || !Array.isArray(context.rules)) {
      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      return {
        input,
        output: currentData,
        results: [],
        totalApplied: 0,
        totalExecutionTimeMs: Number((endTime - startTime).toFixed(2)),
      };
    }

    // priority昇順（数字が小さい順）でソート
    const sortedRules = [...context.rules].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    const results: RuleExecutionResult[] = [];
    let totalApplied = 0;

    for (const rule of sortedRules) {
      const result = this.executeSingleRule(rule, currentData);
      results.push(result);

      if (result.applied && result.success) {
        totalApplied += 1;
        currentData = JSON.parse(JSON.stringify(result.newValue)) as Record<string, unknown>;

        if (context.stopOnFirstMatch) {
          break;
        }
      }
    }

    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
      input,
      output: currentData,
      results,
      totalApplied,
      totalExecutionTimeMs: Number((endTime - startTime).toFixed(2)),
    };
  }

  /**
   * ルール定義の構文・構造妥当性を検証します
   */
  public validateRule(rule: RuleDefinition): RuleValidationResult {
    const errors: string[] = [];

    if (!rule || typeof rule !== 'object') {
      return { valid: false, errors: ['Rule definition must be a valid object'] };
    }

    if (!rule.id || typeof rule.id !== 'string' || rule.id.trim() === '') {
      errors.push('Rule id is required and must be a non-empty string');
    }

    if (!rule.name || typeof rule.name !== 'string' || rule.name.trim() === '') {
      errors.push('Rule name is required and must be a non-empty string');
    }

    if (!Array.isArray(rule.actions) || rule.actions.length === 0) {
      errors.push('Rule must contain at least one action');
    } else {
      rule.actions.forEach((action, index) => {
        if (!action.id) {
          errors.push(`Action at index ${index} missing id`);
        }
        if (!action.type) {
          errors.push(`Action at index ${index} missing type`);
        }
        if (!action.targetField) {
          errors.push(`Action at index ${index} missing targetField`);
        }
      });
    }

    if (rule.conditions && Array.isArray(rule.conditions)) {
      rule.conditions.forEach((condition, index) => {
        if (!condition.id) {
          errors.push(`Condition at index ${index} missing id`);
        }
        if (!condition.field) {
          errors.push(`Condition at index ${index} missing field`);
        }
        if (!condition.operator) {
          errors.push(`Condition at index ${index} missing operator`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

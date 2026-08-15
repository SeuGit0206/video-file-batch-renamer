import { describe, it, expect } from 'vitest';
import type {
  RuleDefinition,
  RuleCondition,
  RuleAction,
  RuleExecutionResult,
  RuleEngineExecutionSummary,
} from '../../../types/rule';
import type { IRuleEngine, RuleValidationResult } from '../../../services/rule/IRuleEngine';

describe('Phase64 Step1: Rule Engine Types & Interfaces Test', () => {
  it('RuleDefinitionオブジェクトの型構造が期待通り構築できる', () => {
    const condition: RuleCondition = {
      id: 'cond-1',
      field: 'originalName',
      operator: 'contains',
      value: 'sample',
    };

    const action: RuleAction = {
      id: 'act-1',
      type: 'replace',
      targetField: 'title',
      value: 'Sample Title',
    };

    const rule: RuleDefinition = {
      id: 'rule-1',
      name: 'Sample Title Replacement Rule',
      description: 'Replace title when filename contains sample',
      enabled: true,
      priority: 10,
      conditionOperator: 'AND',
      conditions: [condition],
      actions: [action],
      version: 1,
      createdAt: '2026-08-05T00:00:00Z',
      updatedAt: '2026-08-05T00:00:00Z',
    };

    expect(rule.id).toBe('rule-1');
    expect(rule.enabled).toBe(true);
    expect(rule.priority).toBe(10);
    expect(rule.conditions).toHaveLength(1);
    expect(rule.conditions[0].operator).toBe('contains');
    expect(rule.actions[0].type).toBe('replace');
  });

  it('RuleExecutionResultおよびRuleEngineExecutionSummaryの型構造が期待通り構築できる', () => {
    const result: RuleExecutionResult = {
      ruleId: 'rule-1',
      ruleName: 'Sample Rule',
      applied: true,
      success: true,
      originalValue: { title: 'old' },
      newValue: { title: 'new' },
      changes: [{ field: 'title', oldValue: 'old', newValue: 'new' }],
      executionTimeMs: 1.5,
    };

    const summary: RuleEngineExecutionSummary = {
      input: { title: 'old' },
      output: { title: 'new' },
      results: [result],
      totalApplied: 1,
      totalExecutionTimeMs: 2.1,
    };

    expect(summary.totalApplied).toBe(1);
    expect(summary.results[0].applied).toBe(true);
    expect(summary.results[0].changes).toHaveLength(1);
  });

  it('IRuleEngine インターフェースを満たすモック実装を作成できる契約である', () => {
    class MockRuleEngine implements IRuleEngine {
      evaluateRule(rule: RuleDefinition, _input: Record<string, unknown>): boolean {
        return rule.enabled;
      }

      execute(context: { input: Record<string, unknown>; rules: RuleDefinition[] }): RuleEngineExecutionSummary {
        return {
          input: context.input,
          output: context.input,
          results: [],
          totalApplied: 0,
          totalExecutionTimeMs: 0,
        };
      }

      executeSingleRule(rule: RuleDefinition, input: Record<string, unknown>): RuleExecutionResult {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          applied: false,
          success: true,
          originalValue: input,
          newValue: input,
          changes: [],
          executionTimeMs: 0,
        };
      }

      validateRule(rule: RuleDefinition): RuleValidationResult {
        return {
          valid: Boolean(rule.name && rule.id),
          errors: [],
        };
      }
    }

    const engine: IRuleEngine = new MockRuleEngine();
    const testRule: RuleDefinition = {
      id: 'mock-rule',
      name: 'Mock Rule',
      enabled: true,
      priority: 1,
      conditionOperator: 'AND',
      conditions: [],
      actions: [],
      createdAt: '2026-08-05T00:00:00Z',
      updatedAt: '2026-08-05T00:00:00Z',
    };

    expect(engine.evaluateRule(testRule, {})).toBe(true);
    expect(engine.validateRule(testRule).valid).toBe(true);
  });
});

import type {
  RuleDefinition,
  RuleCondition,
  RuleAction,
  RuleExecutionResult,
  FieldChange,
  RuleOperator,
} from '../../types/rule';

export class RuleEvaluator {
  /**
   * 単一の条件を入力データに対して評価します
   */
  public evaluateCondition(condition: RuleCondition, input: Record<string, unknown>): boolean {
    const fieldValue = this.getFieldValue(input, condition.field);
    return this.compareValues(fieldValue, condition.operator, condition.value);
  }

  /**
   * ルール全体の条件（AND / OR）を入力データに対して判定します
   */
  public evaluateRule(rule: RuleDefinition, input: Record<string, unknown>): boolean {
    if (!rule.enabled) {
      return false;
    }
    if (!rule.conditions || rule.conditions.length === 0) {
      return true;
    }

    if (rule.conditionOperator === 'OR') {
      return rule.conditions.some((cond) => this.evaluateCondition(cond, input));
    }
    return rule.conditions.every((cond) => this.evaluateCondition(cond, input));
  }

  /**
   * 単一ルールを実行して評価結果と変換後の値を取得します
   */
  public executeRule(rule: RuleDefinition, input: Record<string, unknown>): RuleExecutionResult {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const originalValue = JSON.parse(JSON.stringify(input ?? {})) as Record<string, unknown>;

    if (!rule.enabled) {
      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        applied: false,
        success: true,
        skippedReason: 'Rule is disabled',
        originalValue,
        newValue: originalValue,
        before: originalValue,
        after: originalValue,
        changes: [],
        executionTimeMs: Number((endTime - startTime).toFixed(2)),
      };
    }

    let isMatch = false;
    try {
      isMatch = this.evaluateRule(rule, input);
    } catch (err: unknown) {
      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        applied: false,
        success: false,
        error: `Condition evaluation error: ${errorMessage}`,
        originalValue,
        newValue: originalValue,
        before: originalValue,
        after: originalValue,
        changes: [],
        executionTimeMs: Number((endTime - startTime).toFixed(2)),
      };
    }

    if (!isMatch) {
      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        applied: false,
        success: true,
        skippedReason: 'Condition did not match',
        originalValue,
        newValue: originalValue,
        before: originalValue,
        after: originalValue,
        changes: [],
        executionTimeMs: Number((endTime - startTime).toFixed(2)),
      };
    }

    const newValue = JSON.parse(JSON.stringify(input ?? {})) as Record<string, unknown>;
    const changes: FieldChange[] = [];

    try {
      for (const action of rule.actions) {
        const actionResult = this.applyAction(action, newValue);
        if (actionResult.change) {
          changes.push(actionResult.change);
        }
      }
    } catch (err: unknown) {
      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        applied: false,
        success: false,
        error: errorMessage,
        originalValue,
        newValue,
        before: originalValue,
        after: newValue,
        changes,
        executionTimeMs: Number((endTime - startTime).toFixed(2)),
      };
    }

    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      applied: true,
      success: true,
      originalValue,
      newValue,
      before: originalValue,
      after: newValue,
      changes,
      executionTimeMs: Number((endTime - startTime).toFixed(2)),
    };
  }

  private getFieldValue(input: Record<string, unknown>, field: string): unknown {
    if (!input || typeof input !== 'object') return undefined;
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      return input[field];
    }
    if (field.includes('.')) {
      const parts = field.split('.');
      let current: unknown = input;
      for (const part of parts) {
        if (current && typeof current === 'object' && Object.prototype.hasOwnProperty.call(current, part)) {
          current = (current as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }
      return current;
    }
    return undefined;
  }

  private compareValues(fieldValue: unknown, operator: RuleOperator, expectedValue: unknown): boolean {
    switch (operator) {
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;

      case 'equals':
        if (fieldValue === null || fieldValue === undefined) {
          return expectedValue === null || expectedValue === undefined;
        }
        return String(fieldValue) === String(expectedValue ?? '');

      case 'notEquals':
        return !this.compareValues(fieldValue, 'equals', expectedValue);

      case 'contains':
        if (fieldValue === null || fieldValue === undefined) return false;
        return String(fieldValue).includes(String(expectedValue ?? ''));

      case 'notContains':
        return !this.compareValues(fieldValue, 'contains', expectedValue);

      case 'startsWith':
        if (fieldValue === null || fieldValue === undefined) return false;
        return String(fieldValue).startsWith(String(expectedValue ?? ''));

      case 'endsWith':
        if (fieldValue === null || fieldValue === undefined) return false;
        return String(fieldValue).endsWith(String(expectedValue ?? ''));

      case 'regex': {
        if (fieldValue === null || fieldValue === undefined) return false;
        try {
          const regex = new RegExp(String(expectedValue ?? ''), 'i');
          return regex.test(String(fieldValue));
        } catch {
          return false;
        }
      }

      case 'greaterThan': {
        if (fieldValue === null || fieldValue === undefined) return false;
        const numVal = Number(fieldValue);
        const numExp = Number(expectedValue);
        if (Number.isNaN(numVal) || Number.isNaN(numExp)) return false;
        return numVal > numExp;
      }

      case 'lessThan': {
        if (fieldValue === null || fieldValue === undefined) return false;
        const numVal = Number(fieldValue);
        const numExp = Number(expectedValue);
        if (Number.isNaN(numVal) || Number.isNaN(numExp)) return false;
        return numVal < numExp;
      }

      case 'in': {
        if (fieldValue === null || fieldValue === undefined) return false;
        if (Array.isArray(expectedValue)) {
          return expectedValue.some((item) => String(item) === String(fieldValue));
        }
        return false;
      }

      default:
        return false;
    }
  }

  private applyAction(
    action: RuleAction,
    targetObj: Record<string, unknown>
  ): { change?: FieldChange } {
    const field = action.targetField;
    const oldValue = targetObj[field];

    switch (action.type) {
      case 'replace': {
        const strVal = oldValue !== undefined && oldValue !== null ? String(oldValue) : '';
        let newStr = String(action.value ?? '');
        if (action.pattern !== undefined) {
          newStr = strVal.replace(action.pattern, action.replacement ?? action.value ?? '');
        }
        targetObj[field] = newStr;
        return { change: { field, oldValue, newValue: newStr } };
      }

      case 'prepend': {
        const strVal = oldValue !== undefined && oldValue !== null ? String(oldValue) : '';
        const newStr = `${action.value ?? ''}${strVal}`;
        targetObj[field] = newStr;
        return { change: { field, oldValue, newValue: newStr } };
      }

      case 'append': {
        const strVal = oldValue !== undefined && oldValue !== null ? String(oldValue) : '';
        const newStr = `${strVal}${action.value ?? ''}`;
        targetObj[field] = newStr;
        return { change: { field, oldValue, newValue: newStr } };
      }

      case 'regexReplace': {
        const strVal = oldValue !== undefined && oldValue !== null ? String(oldValue) : '';
        const pattern = action.pattern ?? action.value ?? '';
        try {
          const regex = new RegExp(pattern, 'g');
          const newStr = strVal.replace(regex, action.replacement ?? '');
          targetObj[field] = newStr;
          return { change: { field, oldValue, newValue: newStr } };
        } catch {
          throw new Error('Invalid regular expression');
        }
      }

      case 'uppercase': {
        const strVal = oldValue !== undefined && oldValue !== null ? String(oldValue) : '';
        const newStr = strVal.toUpperCase();
        targetObj[field] = newStr;
        return { change: { field, oldValue, newValue: newStr } };
      }

      case 'lowercase': {
        const strVal = oldValue !== undefined && oldValue !== null ? String(oldValue) : '';
        const newStr = strVal.toLowerCase();
        targetObj[field] = newStr;
        return { change: { field, oldValue, newValue: newStr } };
      }

      case 'remove': {
        const strVal = oldValue !== undefined && oldValue !== null ? String(oldValue) : '';
        if (action.value) {
          const newStr = strVal.split(action.value).join('');
          targetObj[field] = newStr;
          return { change: { field, oldValue, newValue: newStr } };
        } else {
          delete targetObj[field];
          return { change: { field, oldValue, newValue: undefined } };
        }
      }

      case 'setMeta': {
        const newStr = action.value ?? '';
        targetObj[field] = newStr;
        return { change: { field, oldValue, newValue: newStr } };
      }

      default:
        throw new Error(`Unsupported action type: ${(action as { type: string }).type}`);
    }
  }
}

import { describe, it, expect } from 'vitest';
import { RuleEvaluator } from '../../../services/rule/RuleEvaluator';
import type { RuleDefinition, RuleCondition } from '../../../types/rule';

describe('Phase64 Step2: RuleEvaluator Unit Test', () => {
  const evaluator = new RuleEvaluator();

  describe('条件評価 (Condition Evaluation)', () => {
    it('equals および notEquals オペレータが正しく評価される', () => {
      const condEquals: RuleCondition = { id: '1', field: 'status', operator: 'equals', value: 'completed' };
      const condNotEquals: RuleCondition = { id: '2', field: 'status', operator: 'notEquals', value: 'pending' };

      expect(evaluator.evaluateCondition(condEquals, { status: 'completed' })).toBe(true);
      expect(evaluator.evaluateCondition(condEquals, { status: 'pending' })).toBe(false);
      expect(evaluator.evaluateCondition(condNotEquals, { status: 'completed' })).toBe(true);
      expect(evaluator.evaluateCondition(condNotEquals, { status: 'pending' })).toBe(false);
    });

    it('contains および notContains オペレータが正しく評価される', () => {
      const condContains: RuleCondition = { id: '1', field: 'title', operator: 'contains', value: 'sample' };
      const condNotContains: RuleCondition = { id: '2', field: 'title', operator: 'notContains', value: 'test' };

      expect(evaluator.evaluateCondition(condContains, { title: 'movie_sample_v1.mp4' })).toBe(true);
      expect(evaluator.evaluateCondition(condContains, { title: 'other.mp4' })).toBe(false);
      expect(evaluator.evaluateCondition(condNotContains, { title: 'movie_sample_v1.mp4' })).toBe(true);
    });

    it('startsWith および endsWith オペレータが正しく評価される', () => {
      const condStarts: RuleCondition = { id: '1', field: 'name', operator: 'startsWith', value: 'IMG_' };
      const condEnds: RuleCondition = { id: '2', field: 'name', operator: 'endsWith', value: '.mp4' };

      expect(evaluator.evaluateCondition(condStarts, { name: 'IMG_001.jpg' })).toBe(true);
      expect(evaluator.evaluateCondition(condStarts, { name: 'VID_001.mp4' })).toBe(false);
      expect(evaluator.evaluateCondition(condEnds, { name: 'VID_001.mp4' })).toBe(true);
      expect(evaluator.evaluateCondition(condEnds, { name: 'IMG_001.jpg' })).toBe(false);
    });

    it('regex オペレータが正しく評価される', () => {
      const condRegex: RuleCondition = { id: '1', field: 'code', operator: 'regex', value: '^P\\d{3}$' };

      expect(evaluator.evaluateCondition(condRegex, { code: 'P123' })).toBe(true);
      expect(evaluator.evaluateCondition(condRegex, { code: 'P12' })).toBe(false);
    });

    it('greaterThan および lessThan オペレータが正しく評価される', () => {
      const condGt: RuleCondition = { id: '1', field: 'size', operator: 'greaterThan', value: 100 };
      const condLt: RuleCondition = { id: '2', field: 'size', operator: 'lessThan', value: 500 };

      expect(evaluator.evaluateCondition(condGt, { size: 150 })).toBe(true);
      expect(evaluator.evaluateCondition(condGt, { size: 50 })).toBe(false);
      expect(evaluator.evaluateCondition(condLt, { size: 200 })).toBe(true);
      expect(evaluator.evaluateCondition(condLt, { size: 600 })).toBe(false);
    });

    it('in および exists オペレータが正しく評価される', () => {
      const condIn: RuleCondition = { id: '1', field: 'ext', operator: 'in', value: ['mp4', 'mkv', 'avi'] };
      const condExists: RuleCondition = { id: '2', field: 'tag', operator: 'exists' };

      expect(evaluator.evaluateCondition(condIn, { ext: 'mp4' })).toBe(true);
      expect(evaluator.evaluateCondition(condIn, { ext: 'png' })).toBe(false);
      expect(evaluator.evaluateCondition(condExists, { tag: 'action' })).toBe(true);
      expect(evaluator.evaluateCondition(condExists, {})).toBe(false);
    });

    it('null / undefined / 境界値に対する安全な条件評価ができる', () => {
      const cond: RuleCondition = { id: '1', field: 'title', operator: 'contains', value: 'test' };

      expect(evaluator.evaluateCondition(cond, { title: null })).toBe(false);
      expect(evaluator.evaluateCondition(cond, { title: undefined })).toBe(false);
      expect(evaluator.evaluateCondition(cond, {})).toBe(false);

      const condZero: RuleCondition = { id: '2', field: 'count', operator: 'equals', value: 0 };
      expect(evaluator.evaluateCondition(condZero, { count: 0 })).toBe(true);

      const condFalse: RuleCondition = { id: '3', field: 'flag', operator: 'equals', value: 'false' };
      expect(evaluator.evaluateCondition(condFalse, { flag: false })).toBe(true);
    });

    it('AND / OR 論理演算子が正しく評価される', () => {
      const ruleAnd: RuleDefinition = {
        id: 'r1',
        name: 'AND Rule',
        enabled: true,
        priority: 1,
        conditionOperator: 'AND',
        conditions: [
          { id: 'c1', field: 'format', operator: 'equals', value: 'mp4' },
          { id: 'c2', field: 'size', operator: 'greaterThan', value: 10 },
        ],
        actions: [],
        createdAt: '',
        updatedAt: '',
      };

      expect(evaluator.evaluateRule(ruleAnd, { format: 'mp4', size: 20 })).toBe(true);
      expect(evaluator.evaluateRule(ruleAnd, { format: 'mp4', size: 5 })).toBe(false);

      const ruleOr: RuleDefinition = {
        ...ruleAnd,
        conditionOperator: 'OR',
      };

      expect(evaluator.evaluateRule(ruleOr, { format: 'mp4', size: 5 })).toBe(true);
      expect(evaluator.evaluateRule(ruleOr, { format: 'avi', size: 5 })).toBe(false);
    });
  });

  describe('アクション適用 (Action Execution)', () => {
    it('replace, prepend, append アクションが正常に動作する', () => {
      const rule: RuleDefinition = {
        id: 'r-act-1',
        name: 'String Manipulations',
        enabled: true,
        priority: 1,
        conditionOperator: 'AND',
        conditions: [],
        actions: [
          { id: 'a1', type: 'prepend', targetField: 'name', value: 'PREFIX_' },
          { id: 'a2', type: 'append', targetField: 'name', value: '_SUFFIX' },
        ],
        createdAt: '',
        updatedAt: '',
      };

      const result = evaluator.executeRule(rule, { name: 'file' });
      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);
      expect(result.newValue.name).toBe('PREFIX_file_SUFFIX');
    });

    it('regexReplace, uppercase, lowercase アクションが正常に動作する', () => {
      const rule: RuleDefinition = {
        id: 'r-act-2',
        name: 'Regex and Case',
        enabled: true,
        priority: 1,
        conditionOperator: 'AND',
        conditions: [],
        actions: [
          { id: 'a1', type: 'regexReplace', targetField: 'title', pattern: '\\d+', replacement: 'NUM' },
          { id: 'a2', type: 'uppercase', targetField: 'code' },
          { id: 'a3', type: 'lowercase', targetField: 'category' },
        ],
        createdAt: '',
        updatedAt: '',
      };

      const result = evaluator.executeRule(rule, { title: 'video123', code: 'abc', category: 'ACTION' });
      expect(result.success).toBe(true);
      expect(result.newValue.title).toBe('videoNUM');
      expect(result.newValue.code).toBe('ABC');
      expect(result.newValue.category).toBe('action');
    });

    it('remove および setMeta アクションが正常に動作する', () => {
      const rule: RuleDefinition = {
        id: 'r-act-3',
        name: 'Remove and Meta',
        enabled: true,
        priority: 1,
        conditionOperator: 'AND',
        conditions: [],
        actions: [
          { id: 'a1', type: 'remove', targetField: 'filename', value: 'draft_' },
          { id: 'a2', type: 'remove', targetField: 'tempField' },
          { id: 'a3', type: 'setMeta', targetField: 'author', value: 'Admin' },
        ],
        createdAt: '',
        updatedAt: '',
      };

      const result = evaluator.executeRule(rule, { filename: 'draft_main.mp4', tempField: 'junk' });
      expect(result.success).toBe(true);
      expect(result.newValue.filename).toBe('main.mp4');
      expect(result.newValue.tempField).toBeUndefined();
      expect(result.newValue.author).toBe('Admin');
    });
  });

  describe('異常系および境界値 (Error handling & Edge cases)', () => {
    it('不正な regexReplace パターンで例外をキャッチし success: false の結果を返す', () => {
      const rule: RuleDefinition = {
        id: 'r-err-1',
        name: 'Bad Regex',
        enabled: true,
        priority: 1,
        conditionOperator: 'AND',
        conditions: [],
        actions: [{ id: 'a1', type: 'regexReplace', targetField: 'title', pattern: '[unclosed', replacement: 'X' }],
        createdAt: '',
        updatedAt: '',
      };

      const result = evaluator.executeRule(rule, { title: 'test' });
      expect(result.success).toBe(false);
      expect(result.applied).toBe(false);
      expect(result.error).toContain('Invalid regular expression');
    });

    it('未定義の action.type の場合に success: false の結果を返す', () => {
      const rule: RuleDefinition = {
        id: 'r-err-2',
        name: 'Bad Action',
        enabled: true,
        priority: 1,
        conditionOperator: 'AND',
        conditions: [],
        actions: [{ id: 'a1', type: 'unknown_type' as unknown as RuleDefinition['actions'][0]['type'], targetField: 'title' }],
        createdAt: '',
        updatedAt: '',
      };

      const result = evaluator.executeRule(rule, { title: 'test' });
      expect(result.success).toBe(false);
      expect(result.applied).toBe(false);
      expect(result.error).toContain('Unsupported action type');
    });

    it('無効化されたルール (enabled: false) はスキップされる', () => {
      const rule: RuleDefinition = {
        id: 'r-dis',
        name: 'Disabled Rule',
        enabled: false,
        priority: 1,
        conditionOperator: 'AND',
        conditions: [],
        actions: [{ id: 'a1', type: 'uppercase', targetField: 'title' }],
        createdAt: '',
        updatedAt: '',
      };

      const result = evaluator.executeRule(rule, { title: 'test' });
      expect(result.success).toBe(true);
      expect(result.applied).toBe(false);
      expect(result.skippedReason).toBe('Rule is disabled');
      expect(result.newValue.title).toBe('test');
    });
  });
});

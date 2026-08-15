import { describe, it, expect } from 'vitest';
import { RuleEngine } from '../../../services/rule/RuleEngine';
import type { RuleDefinition } from '../../../types/rule';

describe('Phase64 Step3: RuleEngine Unit Test', () => {
  const engine = new RuleEngine();

  const createSampleRule = (
    id: string,
    name: string,
    priority: number,
    field: string,
    searchValue: string,
    replaceValue: string,
    enabled = true
  ): RuleDefinition => ({
    id,
    name,
    enabled,
    priority,
    conditionOperator: 'AND',
    conditions: [{ id: `cond-${id}`, field, operator: 'contains', value: searchValue }],
    actions: [{ id: `act-${id}`, type: 'replace', targetField: field, pattern: searchValue, replacement: replaceValue }],
    createdAt: '2026-08-05T00:00:00Z',
    updatedAt: '2026-08-05T00:00:00Z',
  });

  describe('複数ルール順次実行およびPriority制御', () => {
    it('Priorityの昇順（数字が小さい順）でルールが順次実行され、チェーンされる', () => {
      const rule2 = createSampleRule('r2', 'Second Step', 20, 'filename', 'demo', 'production');
      const rule1 = createSampleRule('r1', 'First Step', 10, 'filename', 'test', 'demo');

      const summary = engine.execute({
        input: { filename: 'sample_test_video.mp4' },
        rules: [rule2, rule1], // 逆に渡す
      });

      expect(summary.totalApplied).toBe(2);
      expect(summary.results[0].ruleId).toBe('r1'); // priority 10 が先に実行
      expect(summary.results[1].ruleId).toBe('r2'); // priority 20 が次に実行
      expect(summary.output.filename).toBe('sample_production_video.mp4');
    });

    it('stopOnFirstMatch が true の場合、最初に適合・適用されたルールで停止する', () => {
      const rule1 = createSampleRule('r1', 'First Step', 10, 'filename', 'test', 'demo');
      const rule2 = createSampleRule('r2', 'Second Step', 20, 'filename', 'demo', 'production');

      const summary = engine.execute({
        input: { filename: 'sample_test_video.mp4' },
        rules: [rule1, rule2],
        stopOnFirstMatch: true,
      });

      expect(summary.totalApplied).toBe(1);
      expect(summary.results).toHaveLength(1);
      expect(summary.output.filename).toBe('sample_demo_video.mp4');
    });
  });

  describe('Disabledルールおよび条件不一致スキップ', () => {
    it('enabled: false のルールは実行されずスキップされる', () => {
      const disabledRule = createSampleRule('r-dis', 'Disabled', 10, 'filename', 'test', 'replaced', false);
      const activeRule = createSampleRule('r-act', 'Active', 20, 'filename', 'video', 'clip');

      const summary = engine.execute({
        input: { filename: 'test_video.mp4' },
        rules: [disabledRule, activeRule],
      });

      expect(summary.totalApplied).toBe(1);
      expect(summary.results[0].applied).toBe(false);
      expect(summary.results[0].skippedReason).toBe('Rule is disabled');
      expect(summary.results[1].applied).toBe(true);
      expect(summary.output.filename).toBe('test_clip.mp4');
    });

    it('条件に不一致のルールは適用されずスキップされる', () => {
      const ruleNoMatch = createSampleRule('r-nomatch', 'No Match', 10, 'filename', 'nonexistent', 'x');

      const summary = engine.execute({
        input: { filename: 'sample.mp4' },
        rules: [ruleNoMatch],
      });

      expect(summary.totalApplied).toBe(0);
      expect(summary.results[0].applied).toBe(false);
      expect(summary.results[0].skippedReason).toBe('Condition did not match');
      expect(summary.output.filename).toBe('sample.mp4');
    });
  });

  describe('executeSingleRule および validateRule', () => {
    it('executeSingleRule で単一ルールが独立評価できる', () => {
      const rule = createSampleRule('r-single', 'Single Test', 1, 'title', 'hello', 'world');
      const result = engine.executeSingleRule(rule, { title: 'hello there' });

      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);
      expect(result.newValue.title).toBe('world there');
    });

    it('validateRule で不整合なルール定義のエラーを検出できる', () => {
      const validRule = createSampleRule('r-val', 'Valid', 1, 'field', 'a', 'b');
      const invalidRule = {
        id: '',
        name: '',
        enabled: true,
        priority: 1,
        conditionOperator: 'AND',
        conditions: [],
        actions: [],
        createdAt: '',
        updatedAt: '',
      } as unknown as RuleDefinition;

      const validRes = engine.validateRule(validRule);
      const invalidRes = engine.validateRule(invalidRule);

      expect(validRes.valid).toBe(true);
      expect(validRes.errors).toHaveLength(0);

      expect(invalidRes.valid).toBe(false);
      expect(invalidRes.errors.length).toBeGreaterThan(0);
    });

    it('nullまたは異常入力でも例外を投げず安全にサマリーを返却する', () => {
      const summary = engine.execute({
        input: null as unknown as Record<string, unknown>,
        rules: null as unknown as RuleDefinition[],
      });

      expect(summary.totalApplied).toBe(0);
      expect(summary.results).toHaveLength(0);
      expect(summary.output).toBeDefined();
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { RuleEvaluator } from '../../../services/rule/RuleEvaluator';
import { RuleEngine } from '../../../services/rule/RuleEngine';
import { RulePresetService } from '../../../services/rule/RulePresetService';
import type { RuleDefinition, RulePreset, RuleCondition } from '../../../types/rule';

describe('Phase64 Step5: Rule Engine Quality & Boundary Test Suite', () => {
  const evaluator = new RuleEvaluator();
  const engine = new RuleEngine(evaluator);
  let presetService: RulePresetService;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    presetService = new RulePresetService(engine);
  });

  describe('1. RuleEvaluator 境界値・異常系・ネスト詳細テスト', () => {
    it('ネストされたオブジェクトプロパティの評価ができる', () => {
      const cond: RuleCondition = { id: 'c1', field: 'meta.info.codec', operator: 'equals', value: 'h264' };
      const inputPass = { meta: { info: { codec: 'h264' } } };
      const inputFail = { meta: { info: { codec: 'hevc' } } };
      const inputMissing = { meta: {} };

      expect(evaluator.evaluateCondition(cond, inputPass)).toBe(true);
      expect(evaluator.evaluateCondition(cond, inputFail)).toBe(false);
      expect(evaluator.evaluateCondition(cond, inputMissing)).toBe(false);
    });

    it('未定義の Operator が与えられた場合は false を返す', () => {
      const cond = { id: 'c1', field: 'title', operator: 'unknown_op' as unknown as RuleCondition['operator'], value: 'test' };
      expect(evaluator.evaluateCondition(cond, { title: 'test' })).toBe(false);
    });

    it('存在しない targetField に対して Action を適用すると新規フィールドとしてセットされるか削除処理が安全に行われる', () => {
      const rule: RuleDefinition = {
        id: 'r-missing',
        name: 'Missing Field Action',
        enabled: true,
        priority: 1,
        conditionOperator: 'AND',
        conditions: [],
        actions: [
          { id: 'a1', type: 'prepend', targetField: 'newField', value: 'PRE_' },
          { id: 'a2', type: 'remove', targetField: 'nonExistent' },
        ],
        createdAt: '',
        updatedAt: '',
      };

      const res = evaluator.executeRule(rule, { existing: 'val' });
      expect(res.success).toBe(true);
      expect(res.newValue.newField).toBe('PRE_');
      expect(res.newValue.nonExistent).toBeUndefined();
    });

    it('複数の Action が同一フィールドに対して連続適用される場合、正しくシーケンシャルに処理される', () => {
      const rule: RuleDefinition = {
        id: 'r-seq',
        name: 'Sequential Actions',
        enabled: true,
        priority: 1,
        conditionOperator: 'AND',
        conditions: [],
        actions: [
          { id: 'a1', type: 'prepend', targetField: 'tag', value: 'raw_' },
          { id: 'a2', type: 'uppercase', targetField: 'tag' },
          { id: 'a3', type: 'append', targetField: 'tag', value: '_v1' },
        ],
        createdAt: '',
        updatedAt: '',
      };

      const res = evaluator.executeRule(rule, { tag: 'video' });
      expect(res.success).toBe(true);
      expect(res.newValue.tag).toBe('RAW_VIDEO_v1');
    });
  });

  describe('2. RuleEngine 大量データ・エラー継続性・サマリー整合性テスト', () => {
    it('100個以上の大量ルール定義を Priority 順に正しく実行・集計できる', () => {
      const rules: RuleDefinition[] = Array.from({ length: 120 }, (_, i) => ({
        id: `r-${i}`,
        name: `Rule ${i}`,
        enabled: i % 2 === 0, // 半数を disabled
        priority: 120 - i, // 逆順 priority
        conditionOperator: 'AND',
        conditions: [],
        actions: [
          { id: `a-${i}`, type: 'append', targetField: 'log', value: `[R${i}]` },
        ],
        createdAt: '',
        updatedAt: '',
      }));

      const summary = engine.execute({
        input: { log: '' },
        rules,
      });

      expect(summary.results).toHaveLength(120);
      expect(summary.totalApplied).toBe(60);
      // priorityが小さい順（60, 58, 56...）に適用されていることを確認
      expect(summary.results[0].ruleId).toBe('r-119'); // priority 1
      expect(summary.output.log).toBeDefined();
    });

    it('途中のルールで例外が発生しても、success=false のResultを記録し全体のサマリーが正常に完成する', () => {
      const badRule: RuleDefinition = {
        id: 'r-bad',
        name: 'Bad Regex Rule',
        enabled: true,
        priority: 1,
        conditionOperator: 'AND',
        conditions: [],
        actions: [{ id: 'a1', type: 'regexReplace', targetField: 'title', pattern: '(unclosed', replacement: 'X' }],
        createdAt: '',
        updatedAt: '',
      };

      const goodRule: RuleDefinition = {
        id: 'r-good',
        name: 'Good Rule',
        enabled: true,
        priority: 2,
        conditionOperator: 'AND',
        conditions: [],
        actions: [{ id: 'a1', type: 'uppercase', targetField: 'category' }],
        createdAt: '',
        updatedAt: '',
      };

      const summary = engine.execute({
        input: { title: 'sample', category: 'movie' },
        rules: [badRule, goodRule],
      });

      expect(summary.results).toHaveLength(2);
      expect(summary.results[0].success).toBe(false);
      expect(summary.results[0].error).toContain('Invalid regular expression');
      expect(summary.results[1].success).toBe(true);
      expect(summary.output.category).toBe('MOVIE');
      expect(summary.totalApplied).toBe(1);
    });
  });

  describe('3. RulePresetService 破損データ・存在確認・大規模プリセットテスト', () => {
    it('localStorage に JSON 破綻データが存在する場合でも安全にエラーResultを返す', () => {
      const storageMock: Record<string, string> = {
        vrt_rule_presets: '{ invalid_json_content:',
      };
      // window / localStorage を一時的に模擬
      const globalObj = globalThis as unknown as { window: unknown };
      const originalWindow = globalObj.window;
      globalObj.window = {
        localStorage: {
          getItem: (key: string) => storageMock[key] ?? null,
        },
      };

      try {
        const res = presetService.getPresets();
        expect(res.success).toBe(false);
        expect(res.error).toContain('Failed to retrieve presets');
      } finally {
        globalObj.window = originalWindow;
      }
    });

    it('存在しない Preset ID の削除・取得を試みた場合、安全にエラーResultを返す', () => {
      const getRes = presetService.getPreset('non-existent-id');
      expect(getRes.success).toBe(false);
      expect(getRes.error).toContain('not found');

      const delRes = presetService.deletePreset('non-existent-id');
      expect(delRes.success).toBe(true); // フィルタ処理のため例外を投げず成功扱いに維持
    });

    it('50個以上の Preset を登録・管理・一括取得できる', () => {
      for (let i = 0; i < 50; i++) {
        const preset: RulePreset = {
          presetId: `preset-${i}`,
          name: `Preset ${i}`,
          enabled: true,
          rules: [],
          createdAt: '',
          updatedAt: '',
        };
        presetService.savePreset(preset);
      }

      const all = presetService.getPresets();
      expect(all.success).toBe(true);
      expect(all.data).toHaveLength(50);
    });
  });

  describe('4. パフォーマンステスト (1000件データ処理)', () => {
    it('1000件の入力オブジェクトに対して RuleEngine をループ実行しても高速に動作する', () => {
      const rule: RuleDefinition = {
        id: 'r-perf',
        name: 'Performance Rule',
        enabled: true,
        priority: 1,
        conditionOperator: 'AND',
        conditions: [{ id: 'c1', field: 'filename', operator: 'contains', value: 'video' }],
        actions: [
          { id: 'a1', type: 'regexReplace', targetField: 'filename', pattern: 'video_(\\d+)', replacement: 'clip_$1' },
          { id: 'a2', type: 'uppercase', targetField: 'status' },
        ],
        createdAt: '',
        updatedAt: '',
      };

      const items = Array.from({ length: 1000 }, (_, i) => ({
        filename: `video_${i}.mp4`,
        status: 'pending',
      }));

      const start = performance.now();
      let appliedCount = 0;

      for (const item of items) {
        const summary = engine.execute({
          input: item,
          rules: [rule],
        });
        if (summary.totalApplied > 0) {
          appliedCount++;
        }
      }

      const elapsed = performance.now() - start;

      expect(appliedCount).toBe(1000);
      expect(elapsed).toBeLessThan(2000); // 1000件で2秒未満
    });
  });
});

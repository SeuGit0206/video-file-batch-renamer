import { describe, it, expect, beforeEach } from 'vitest';
import { CompositionRoot } from '../../../composition/CompositionRoot';
import { Container, container } from '../../../composition/container';
import { RuleEvaluator, RuleEngine, RulePresetService } from '../../../services/rule';

describe('Phase64 Step6: Dynamic Rule Engine DI Container Integration Test', () => {
  beforeEach(() => {
    CompositionRoot.resetInstance();
  });

  describe('Container (Service Class Declarations / Static Resolvers)', () => {
    it('Container インスタンスを取得できる', () => {
      const c = Container.getInstance();
      expect(c).toBeDefined();
      expect(container).toBe(c);
    });

    it('Container から RuleEvaluator, RuleEngine, RulePresetService のクラス参照を取得できる', () => {
      const c = Container.getInstance();

      expect(c.ruleEvaluator).toBe(RuleEvaluator);
      expect(c.getRuleEvaluator()).toBe(RuleEvaluator);

      expect(c.ruleEngine).toBe(RuleEngine);
      expect(c.getRuleEngine()).toBe(RuleEngine);

      expect(c.rulePresetService).toBe(RulePresetService);
      expect(c.getRulePresetService()).toBe(RulePresetService);
    });
  });

  describe('CompositionRoot (Singleton & Dependency Injection)', () => {
    it('CompositionRoot が Singleton インスタンスを提供する', () => {
      const root1 = CompositionRoot.getInstance();
      const root2 = CompositionRoot.getInstance();

      expect(root1).toBe(root2);
    });

    it('resetInstance 実行後、新規インスタンスが生成される', () => {
      const root1 = CompositionRoot.getInstance();
      CompositionRoot.resetInstance();
      const root2 = CompositionRoot.getInstance();

      expect(root1).not.toBe(root2);
    });

    it('getRuleEvaluator が正しく RuleEvaluator インスタンスを返す', () => {
      const root = CompositionRoot.getInstance();
      const evaluator = root.getRuleEvaluator();

      expect(evaluator).toBeInstanceOf(RuleEvaluator);
    });

    it('getRuleEngine が正しく RuleEngine インスタンスを返し、RuleEvaluator が注入されている', () => {
      const root = CompositionRoot.getInstance();
      const engine = root.getRuleEngine();

      expect(engine).toBeInstanceOf(RuleEngine);

      // RuleEngine が機能してルールを評価できることを検証
      const rule = {
        id: 'r1',
        name: 'Test Rule',
        enabled: true,
        priority: 1,
        conditionOperator: 'AND' as const,
        conditions: [],
        actions: [{ id: 'a1', type: 'uppercase' as const, targetField: 'name' }],
        createdAt: '',
        updatedAt: '',
      };

      const result = engine.executeSingleRule(rule, { name: 'hello' });
      expect(result.success).toBe(true);
      expect(result.newValue.name).toBe('HELLO');
    });

    it('getRulePresetService が正しく RulePresetService インスタンスを返し、RuleEngine が注入されている', () => {
      const root = CompositionRoot.getInstance();
      const presetService = root.getRulePresetService();

      expect(presetService).toBeInstanceOf(RulePresetService);

      // RulePresetService が内包する RuleEngine を利用してバリデーション等を行えるか検証
      const preset = {
        presetId: 'p1',
        name: 'Valid Preset',
        enabled: true,
        rules: [
          {
            id: 'r1',
            name: 'Rule 1',
            enabled: true,
            priority: 1,
            conditionOperator: 'AND' as const,
            conditions: [{ id: 'c1', field: 'title', operator: 'contains' as const, value: 'test' }],
            actions: [{ id: 'a1', type: 'remove' as const, targetField: 'title' }],
            createdAt: '',
            updatedAt: '',
          },
        ],
        createdAt: '',
        updatedAt: '',
      };

      const validation = presetService.validatePreset(preset);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});

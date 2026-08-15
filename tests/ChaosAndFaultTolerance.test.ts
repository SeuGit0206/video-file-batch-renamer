import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ChaosInjector,
  SelfHealingRecoveryService,
  FaultToleranceValidator,
  ChaosDiagnostics,
} from '../src/chaos';
import { FeatureFlagService, EnvironmentProvider } from '../src/config';
import {
  CircuitBreakerPolicy,
  BulkheadPolicy,
  RateLimiterPolicy,
} from '../src/policies';
import { CompositionRoot } from '../src/composition/CompositionRoot';

describe('Phase37 Advanced Fault Tolerance & Chaos Engineering Suite', () => {
  describe('ChaosInjector', () => {
    let featureFlags: FeatureFlagService;
    let chaosInjector: ChaosInjector;

    beforeEach(() => {
      const env = new EnvironmentProvider();
      featureFlags = new FeatureFlagService(env);
      chaosInjector = new ChaosInjector(featureFlags);
    });

    it('FeatureFlagがOFFの場合は障害が注入されないこと', async () => {
      featureFlags.setFlag('ENABLE_CHAOS_ENGINEERING', false);
      chaosInjector.setConfig({
        enabled: true,
        httpErrorCode: 500,
        delayMs: 100,
        failureRate: 1.0,
      });

      // 障害が注入されずに正常終了すること
      await expect(chaosInjector.injectDelayIfNeeded()).resolves.toBeUndefined();
      expect(() => chaosInjector.maybeInjectHttpError()).not.toThrow();
      expect(() => chaosInjector.maybeInjectRandomFailure()).not.toThrow();
    });

    it('FeatureFlagがONの時に Network Delay が注入されること', async () => {
      featureFlags.setFlag('ENABLE_CHAOS_ENGINEERING', true);
      chaosInjector.setConfig({ enabled: true, delayMs: 50 });

      const start = Date.now();
      await chaosInjector.injectDelayIfNeeded();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(40);
    });

    it('FeatureFlagがONの時に HTTP Error が注入されること', () => {
      featureFlags.setFlag('ENABLE_CHAOS_ENGINEERING', true);
      chaosInjector.setConfig({ enabled: true, httpErrorCode: 503 });

      expect(() => chaosInjector.maybeInjectHttpError()).toThrow('[ChaosInjector] Injected HTTP Error 503');
    });

    it('FeatureFlagがONの時に Timeout エラーが注入されること', async () => {
      featureFlags.setFlag('ENABLE_CHAOS_ENGINEERING', true);
      chaosInjector.setConfig({ enabled: true, timeoutMs: 30 });

      await expect(chaosInjector.maybeInjectTimeout()).rejects.toThrow('Operation timed out after 30ms');
    });

    it('FeatureFlagがONの時に Random Failure (確率1.0) でエラーが投げられること', () => {
      featureFlags.setFlag('ENABLE_CHAOS_ENGINEERING', true);
      chaosInjector.setConfig({ enabled: true, failureRate: 1.0 });

      expect(() => chaosInjector.maybeInjectRandomFailure()).toThrow('[ChaosInjector] Injected Random Failure');
    });
  });

  describe('SelfHealingRecoveryService', () => {
    let service: SelfHealingRecoveryService;

    beforeEach(() => {
      service = new SelfHealingRecoveryService();
    });

    it('Primary Actionが初回で成功した場合、リトライなしで結果を返すこと', async () => {
      const result = await service.executeWithSelfHealing(async () => 'success_data');

      expect(result.success).toBe(true);
      expect(result.data).toBe('success_data');
      expect(result.recoveredBySelfHealing).toBe(false);
      expect(result.usedFallback).toBe(false);
      expect(result.retryAttempts).toBe(0);
    });

    it('Primary Actionが失敗後リトライで成功した場合、Self-Healing成功と判定されること', async () => {
      let attempts = 0;
      const result = await service.executeWithSelfHealing(
        async () => {
          attempts++;
          if (attempts === 1) {
            throw new Error('Temporary glitch');
          }
          return 'recovered_data';
        },
        undefined,
        2
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('recovered_data');
      expect(result.recoveredBySelfHealing).toBe(true);
      expect(result.usedFallback).toBe(false);
      expect(result.retryAttempts).toBe(1);
    });

    it('Primary Actionが全滅時に Fallback Provider が実行されて成功すること', async () => {
      const result = await service.executeWithSelfHealing(
        async () => {
          throw new Error('Primary fully down');
        },
        async () => 'fallback_data',
        1
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('fallback_data');
      expect(result.recoveredBySelfHealing).toBe(true);
      expect(result.usedFallback).toBe(true);
    });

    it('ログが正常に記録およびクリアできること', async () => {
      await service.executeWithSelfHealing(
        async () => {
          throw new Error('Failure log test');
        },
        async () => 'ok',
        1
      );

      const logs = service.getRecoveryLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].message).toContain('Failure log test');

      service.clearLogs();
      expect(service.getRecoveryLogs().length).toBe(0);
    });
  });

  describe('FaultToleranceValidator', () => {
    let validator: FaultToleranceValidator;

    beforeEach(() => {
      validator = new FaultToleranceValidator();
    });

    it('Circuit Breaker のトリップ状態を検証できること', async () => {
      const cb = new CircuitBreakerPolicy({ failureThreshold: 2, resetTimeoutMs: 5000 });
      const isValid = await validator.validateCircuitBreaker(cb);
      expect(isValid).toBe(true);
    });

    it('Bulkhead (容量超過制限) を検証できること', async () => {
      const bulkhead = new BulkheadPolicy({ maxConcurrent: 2, maxQueueing: 0 });
      const isValid = await validator.validateBulkhead(bulkhead);
      expect(isValid).toBe(true);
    });

    it('Rate Limiter (レート制限) を検証できること', async () => {
      const rateLimiter = new RateLimiterPolicy({ maxRequests: 3, windowMs: 10000 });
      const isValid = await validator.validateRateLimiter(rateLimiter);
      expect(isValid).toBe(true);
    });

    it('Cache 障害バイパスをシミュレーションできること', async () => {
      const mockCache = {
        get: vi.fn().mockResolvedValue('value'),
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        has: vi.fn(),
      };

      const bypassed = await validator.simulateCacheFailure(mockCache as never);
      expect(bypassed).toBe(true);
    });
  });

  describe('ChaosDiagnostics', () => {
    let diagnostics: ChaosDiagnostics;

    beforeEach(() => {
      diagnostics = new ChaosDiagnostics();
    });

    it('Failure Timeline イベントを記録および取得できること', () => {
      diagnostics.recordEvent('CHAOS_INJECTED', 'HTTP_CLIENT', 'Injected 500 status');
      diagnostics.recordEvent('RECOVERY_SUCCEEDED', 'FALLBACK_SERVICE', 'Recovered using secondary provider');

      const timeline = diagnostics.getTimeline();
      expect(timeline.length).toBe(2);
      expect(timeline[0].type).toBe('CHAOS_INJECTED');
      expect(timeline[1].type).toBe('RECOVERY_SUCCEEDED');
    });

    it('Chaos Report および Recovery Report を生成できること', () => {
      diagnostics.recordEvent('CHAOS_INJECTED', 'NETWORK', 'Delay injected');
      diagnostics.recordEvent('RECOVERY_ATTEMPTED', 'RETRY_POLICY', 'Attempting retry 1');
      diagnostics.recordEvent('RECOVERY_SUCCEEDED', 'RETRY_POLICY', 'Recovered');

      const chaosReport = diagnostics.generateChaosReport({ enabled: true });
      expect(chaosReport.totalInjectedFailures).toBe(1);
      expect(chaosReport.totalRecoveredFailures).toBe(1);
      expect(chaosReport.recoveryRate).toBe(1.0);

      const recoveryReport = diagnostics.generateRecoveryReport();
      expect(recoveryReport.totalRecoveryAttempts).toBe(1);
      expect(recoveryReport.successfulRecoveries).toBe(1);
      expect(recoveryReport.failedRecoveries).toBe(0);
    });
  });

  describe('CompositionRoot Integration', () => {
    it('CompositionRoot から Chaos 関連の各コンポーネントが正常に取得できること', () => {
      const root = new CompositionRoot();

      expect(root.getChaosInjector()).toBeDefined();
      expect(root.getSelfHealingRecoveryService()).toBeDefined();
      expect(root.getFaultToleranceValidator()).toBeDefined();
      expect(root.getChaosDiagnostics()).toBeDefined();
    });
  });
});

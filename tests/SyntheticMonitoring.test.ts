import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SyntheticMonitor,
  VerificationEngine,
  MonitoringScheduler,
  ReportingService,
  NotificationService,
} from '../src/synthetic';
import { FeatureFlagService, EnvironmentProvider } from '../src/config';
import { CompositionRoot } from '../src/composition/CompositionRoot';

describe('Phase38 End-to-End Synthetic Monitoring & Continuous Verification Suite', () => {
  let featureFlags: FeatureFlagService;
  let monitor: SyntheticMonitor;
  let verificationEngine: VerificationEngine;
  let scheduler: MonitoringScheduler;
  let reportingService: ReportingService;
  let notificationService: NotificationService;

  beforeEach(() => {
    const env = new EnvironmentProvider();
    featureFlags = new FeatureFlagService(env);
    featureFlags.setFlag('ENABLE_SYNTHETIC_MONITORING', true);

    monitor = new SyntheticMonitor(featureFlags);
    verificationEngine = new VerificationEngine();
    scheduler = new MonitoringScheduler(monitor, verificationEngine, featureFlags);
    reportingService = new ReportingService(monitor, verificationEngine);
    notificationService = new NotificationService();
  });

  describe('SyntheticMonitor', () => {
    it('runHealthCheck が正常なステータスとメモリ統計を記録すること', async () => {
      const result = await monitor.runHealthCheck();

      expect(result.type).toBe('HEALTH');
      expect(result.status).toBe('PASS');
      expect(result.details?.heapUsed).toBeDefined();

      const history = monitor.getCheckHistory();
      expect(history.length).toBe(1);
      expect(history[0].checkId).toBe(result.checkId);
    });

    it('runApiCheck が期待通りのHTTPステータスを評価できること', async () => {
      const passResult = await monitor.runApiCheck('/api/metadata', 200);
      expect(passResult.type).toBe('API');
      expect(passResult.status).toBe('PASS');

      const failResult = await monitor.runApiCheck('/api/invalid', 200);
      expect(failResult.status).toBe('FAIL');
    });

    it('runScrapingScenarioCheck でスクレイピングシナリオのアサーションを実行できること', async () => {
      const result = await monitor.runScrapingScenarioCheck('PRODUCT-123', async (id) => {
        return id === 'PRODUCT-123';
      });

      expect(result.type).toBe('SCRAPING_SCENARIO');
      expect(result.status).toBe('PASS');
    });

    it('FeatureFlagがOFFの場合、チェックがバイパスされること', async () => {
      featureFlags.setFlag('ENABLE_SYNTHETIC_MONITORING', false);

      const result = await monitor.runHealthCheck();
      expect(result.message).toContain('disabled via feature flag');
    });
  });

  describe('VerificationEngine', () => {
    it('シナリオを登録して実行・検証できること', async () => {
      verificationEngine.registerScenario({
        id: 'scenario_01',
        name: 'E2E Metadata Pipeline Check',
        description: 'Verify metadata extraction pipeline end to end',
        run: async () => true,
      });

      const result = await verificationEngine.runScenario('scenario_01');
      expect(result.passed).toBe(true);
      expect(result.scenarioName).toBe('E2E Metadata Pipeline Check');

      const history = verificationEngine.getRunHistory();
      expect(history.length).toBe(1);
    });

    it('例外が発生するシナリオで失敗結果が記録されること', async () => {
      verificationEngine.registerScenario({
        id: 'scenario_err',
        name: 'Failing Scenario',
        description: 'Test error catching',
        run: async () => {
          throw new Error('Pipeline timeout');
        },
      });

      const result = await verificationEngine.runScenario('scenario_err');
      expect(result.passed).toBe(false);
      expect(result.error).toBe('Pipeline timeout');
    });

    it('runAllScenarios で全登録シナリオを一括実行できること', async () => {
      verificationEngine.registerScenario({
        id: 's1',
        name: 'Scenario 1',
        description: 'Desc 1',
        run: async () => true,
      });
      verificationEngine.registerScenario({
        id: 's2',
        name: 'Scenario 2',
        description: 'Desc 2',
        run: async () => true,
      });

      const results = await verificationEngine.runAllScenarios();
      expect(results.length).toBe(2);
      expect(results.every((r) => r.passed)).toBe(true);
    });
  });

  describe('MonitoringScheduler', () => {
    it('手動トリガーでヘルスチェックとシナリオ実行が誘発されること', async () => {
      verificationEngine.registerScenario({
        id: 'sched_scenario',
        name: 'Scheduled Scenario',
        description: 'Test scheduling',
        run: async () => true,
      });

      await scheduler.triggerManualRun();

      expect(monitor.getCheckHistory().length).toBeGreaterThanOrEqual(2); // health + api
      expect(verificationEngine.getRunHistory().length).toBe(1);
    });

    it('スケジュール開始と停止の状態が管理できること', () => {
      scheduler.startSchedule(10000);
      expect(scheduler.isRunning()).toBe(true);

      scheduler.stopSchedule();
      expect(scheduler.isRunning()).toBe(false);
    });
  });

  describe('ReportingService & NotificationService', () => {
    it('HealthReport, VerificationReport, MonitoringSummary が正常に生成できること', async () => {
      await monitor.runHealthCheck();

      verificationEngine.registerScenario({
        id: 'sc1',
        name: 'Test Scenario',
        description: 'Description',
        run: async () => true,
      });
      await verificationEngine.runScenario('sc1');

      const healthReport = reportingService.generateHealthReport();
      expect(healthReport.systemStatus).toBe('HEALTHY');
      expect(healthReport.totalChecks).toBe(1);

      const verificationReport = reportingService.generateVerificationReport();
      expect(verificationReport.totalScenariosRun).toBe(1);
      expect(verificationReport.passRate).toBe(1.0);

      const summary = reportingService.generateMonitoringSummary();
      expect(summary.overallScorePercentage).toBe(100);
    });

    it('NotificationService でハンドラ登録と通知イベントが正常に伝搬されること', () => {
      const handlerSpy = vi.fn();
      notificationService.registerHandler(handlerSpy);

      notificationService.notifyAlert('WARNING', 'High Latency Detected', 'Scraping delay exceeds 2000ms');

      expect(handlerSpy).toHaveBeenCalledTimes(1);
      const alert = handlerSpy.mock.calls[0][0];
      expect(alert.severity).toBe('WARNING');
      expect(alert.title).toBe('High Latency Detected');

      const history = notificationService.getAlertHistory();
      expect(history.length).toBe(1);
    });

    it('notifyReportSummary でサマリーに基づくアラートを発行できること', async () => {
      const handlerSpy = vi.fn();
      notificationService.registerHandler(handlerSpy);

      const summary = reportingService.generateMonitoringSummary();
      notificationService.notifyReportSummary(summary);

      expect(handlerSpy).toHaveBeenCalledTimes(1);
      expect(handlerSpy.mock.calls[0][0].severity).toBe('INFO');
    });
  });

  describe('CompositionRoot Integration', () => {
    it('CompositionRoot から Phase38 Synthetic Monitoring コンポーネントがすべて取得できること', () => {
      const root = new CompositionRoot();

      expect(root.getSyntheticMonitor()).toBeDefined();
      expect(root.getVerificationEngine()).toBeDefined();
      expect(root.getMonitoringScheduler()).toBeDefined();
      expect(root.getReportingService()).toBeDefined();
      expect(root.getNotificationService()).toBeDefined();
    });
  });
});

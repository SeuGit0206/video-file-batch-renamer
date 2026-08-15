import { describe, it, expect, beforeEach } from 'vitest';
import {
  ArchitectureHealthChecker,
  DependencyAnalyzer,
  ConfigurationAuditor,
  SecurityAuditor,
  PerformanceBenchmarker,
  LoadTestRunner,
  ReleaseReadinessReportGenerator,
  OperationalDashboardBackend,
} from '../src/readiness';
import { FeatureFlagService, EnvironmentProvider } from '../src/config';
import { CompositionRoot } from '../src/composition/CompositionRoot';

describe('Phase39 Release Readiness & Operational Excellence Suite', () => {
  let featureFlags: FeatureFlagService;
  let archChecker: ArchitectureHealthChecker;
  let depAnalyzer: DependencyAnalyzer;
  let configAuditor: ConfigurationAuditor;
  let securityAuditor: SecurityAuditor;
  let perfBenchmarker: PerformanceBenchmarker;
  let loadTestRunner: LoadTestRunner;
  let reportGenerator: ReleaseReadinessReportGenerator;
  let dashboardBackend: OperationalDashboardBackend;

  beforeEach(() => {
    const env = new EnvironmentProvider();
    featureFlags = new FeatureFlagService(env);
    featureFlags.setFlag('ENABLE_RELEASE_READINESS', true);

    archChecker = new ArchitectureHealthChecker(featureFlags);
    depAnalyzer = new DependencyAnalyzer();
    configAuditor = new ConfigurationAuditor(featureFlags);
    securityAuditor = new SecurityAuditor();
    perfBenchmarker = new PerformanceBenchmarker();
    loadTestRunner = new LoadTestRunner();

    reportGenerator = new ReleaseReadinessReportGenerator(
      archChecker,
      depAnalyzer,
      configAuditor,
      securityAuditor,
      perfBenchmarker,
      loadTestRunner
    );

    dashboardBackend = new OperationalDashboardBackend(reportGenerator);
  });

  describe('ArchitectureHealthChecker', () => {
    it('アーキテクチャの健全性チェックを実行し、スコアとルール結果を返すこと', async () => {
      const result = await archChecker.checkArchitectureHealth();

      expect(result.checkedRulesCount).toBeGreaterThan(0);
      expect(result.scorePercentage).toBeGreaterThanOrEqual(0);
      expect(typeof result.isHealthy).toBe('boolean');
    });

    it('FeatureFlagがOFFの場合、チェックがバイパスされてスコア100%を返すこと', async () => {
      featureFlags.setFlag('ENABLE_RELEASE_READINESS', false);
      const result = await archChecker.checkArchitectureHealth();

      expect(result.scorePercentage).toBe(100);
      expect(result.checkedRulesCount).toBe(0);
    });
  });

  describe('DependencyAnalyzer', () => {
    it('package.json の依存関係を正確に解析できること', async () => {
      const result = await depAnalyzer.analyzeDependencies();

      expect(result.totalDependencies).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('ConfigurationAuditor', () => {
    it('環境変数と機能フラグ設定の監査結果を出力すること', async () => {
      const result = await configAuditor.auditConfiguration();

      expect(result.totalKeysChecked).toBeGreaterThan(0);
      expect(result.items.some((i) => i.key === 'NODE_ENV')).toBe(true);
    });
  });

  describe('SecurityAuditor', () => {
    it('セキュリティチェック項目（ヘッダー、バリデーション等）を評価しスコアを算出すること', async () => {
      const result = await securityAuditor.auditSecurity();

      expect(result.totalChecks).toBeGreaterThan(0);
      expect(result.passedChecks).toBeGreaterThan(0);
      expect(result.scorePercentage).toBeGreaterThan(0);
    });
  });

  describe('PerformanceBenchmarker', () => {
    it('マイクロベンチマークを実行し、p50, p95, ops/sec を算出すること', async () => {
      const result = await perfBenchmarker.runBenchmarkSuite();

      expect(result.benchmarks.length).toBeGreaterThan(0);
      expect(result.overallPerformanceGrade).toBeDefined();

      const jsonBench = result.benchmarks.find((b) => b.taskName === 'JSON Serialization');
      expect(jsonBench).toBeDefined();
      expect(jsonBench?.operationsPerSec).toBeGreaterThan(0);
    });
  });

  describe('LoadTestRunner', () => {
    it('負荷テストを実行し、RPS・遅延・エラー率を返却すること', async () => {
      const result = await loadTestRunner.runLoadTest(
        { virtualUsers: 5, durationMs: 100 },
        async () => true
      );

      expect(result.totalRequests).toBeGreaterThan(0);
      expect(result.successfulRequests).toBe(result.totalRequests);
      expect(result.errorRatePercentage).toBe(0);
      expect(result.requestsPerSecond).toBeGreaterThan(0);
    });
  });

  describe('ReleaseReadinessReportGenerator', () => {
    it('全監査コンポーネントを統合したリリースマネジメントレポートを生成できること', async () => {
      const report = await reportGenerator.generateReport();

      expect(report.overallVerdict).toBeDefined();
      expect(report.readinessScorePercentage).toBeGreaterThan(0);
      expect(report.architectureHealth).toBeDefined();
      expect(report.securityAudit).toBeDefined();
      expect(report.performanceBenchmark).toBeDefined();
      expect(report.loadTestResult).toBeDefined();
    });
  });

  describe('OperationalDashboardBackend', () => {
    it('ダッシュボードメトリクスと最新のレポート情報を提供できること', async () => {
      const metrics = await dashboardBackend.getDashboardMetrics();

      expect(metrics.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsageMb.heapUsed).toBeGreaterThan(0);
      expect(metrics.nodeVersion).toBeDefined();
      expect(metrics.lastReport).toBeDefined();

      const freshReport = await dashboardBackend.generateFreshReadinessReport();
      expect(freshReport).toBeDefined();
    });
  });

  describe('CompositionRoot Integration', () => {
    it('CompositionRoot から Phase39 Release Readiness コンポーネントがすべて取得できること', () => {
      const root = new CompositionRoot();

      expect(root.getArchitectureHealthChecker()).toBeDefined();
      expect(root.getDependencyAnalyzer()).toBeDefined();
      expect(root.getConfigurationAuditor()).toBeDefined();
      expect(root.getSecurityAuditor()).toBeDefined();
      expect(root.getPerformanceBenchmarker()).toBeDefined();
      expect(root.getLoadTestRunner()).toBeDefined();
      expect(root.getReleaseReadinessReportGenerator()).toBeDefined();
      expect(root.getOperationalDashboardBackend()).toBeDefined();
    });
  });
});

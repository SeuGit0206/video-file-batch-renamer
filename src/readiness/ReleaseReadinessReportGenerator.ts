import type { ArchitectureHealthReport, IArchitectureHealthChecker } from './ArchitectureHealthChecker';
import type { DependencyAnalysisReport, IDependencyAnalyzer } from './DependencyAnalyzer';
import type { ConfigurationAuditReport, IConfigurationAuditor } from './ConfigurationAuditor';
import type { SecurityAuditReport, ISecurityAuditor } from './SecurityAuditor';
import type { PerformanceBenchmarkReport, IPerformanceBenchmarker } from './PerformanceBenchmarker';
import type { LoadTestResult, ILoadTestRunner } from './LoadTestRunner';

export interface ReleaseReadinessReport {
  overallVerdict: 'READY_FOR_PRODUCTION' | 'NEEDS_REMEDIATION' | 'BLOCKED';
  readinessScorePercentage: number;
  architectureHealth: ArchitectureHealthReport;
  dependencyAnalysis: DependencyAnalysisReport;
  configurationAudit: ConfigurationAuditReport;
  securityAudit: SecurityAuditReport;
  performanceBenchmark: PerformanceBenchmarkReport;
  loadTestResult: LoadTestResult;
  remediationsRequired: string[];
  generatedAt: string;
}

export interface IReleaseReadinessReportGenerator {
  generateReport(): Promise<ReleaseReadinessReport>;
}

export class ReleaseReadinessReportGenerator implements IReleaseReadinessReportGenerator {
  private archChecker: IArchitectureHealthChecker;
  private depAnalyzer: IDependencyAnalyzer;
  private configAuditor: IConfigurationAuditor;
  private securityAuditor: ISecurityAuditor;
  private perfBenchmarker: IPerformanceBenchmarker;
  private loadTestRunner: ILoadTestRunner;

  constructor(
    archChecker: IArchitectureHealthChecker,
    depAnalyzer: IDependencyAnalyzer,
    configAuditor: IConfigurationAuditor,
    securityAuditor: ISecurityAuditor,
    perfBenchmarker: IPerformanceBenchmarker,
    loadTestRunner: ILoadTestRunner
  ) {
    this.archChecker = archChecker;
    this.depAnalyzer = depAnalyzer;
    this.configAuditor = configAuditor;
    this.securityAuditor = securityAuditor;
    this.perfBenchmarker = perfBenchmarker;
    this.loadTestRunner = loadTestRunner;
  }

  public async generateReport(): Promise<ReleaseReadinessReport> {
    const arch = await this.archChecker.checkArchitectureHealth();
    const dep = await this.depAnalyzer.analyzeDependencies();
    const config = await this.configAuditor.auditConfiguration();
    const sec = await this.securityAuditor.auditSecurity();
    const perf = await this.perfBenchmarker.runBenchmarkSuite();
    const load = await this.loadTestRunner.runLoadTest({ virtualUsers: 5, durationMs: 200 });

    const remediations: string[] = [];

    arch.issues.forEach((i) => remediations.push(`[Architecture] ${i.component}: ${i.description}`));
    dep.issues.forEach((i) => remediations.push(`[Dependency] ${i.dependencyName}: ${i.message}`));
    config.items
      .filter((i) => i.recommendation)
      .forEach((i) => remediations.push(`[Config] ${i.key}: ${i.recommendation}`));
    sec.checks
      .filter((c) => c.remediation)
      .forEach((c) => remediations.push(`[Security] ${c.name}: ${c.remediation}`));

    // Overall Score Calculation
    const archScore = arch.scorePercentage;
    const secScore = sec.scorePercentage;
    const configScore = config.isConfiguredForProduction ? 100 : 80;
    const loadScore = load.errorRatePercentage < 1 ? 100 : 50;

    const overallScore = Math.round((archScore + secScore + configScore + loadScore) / 4);

    let verdict: ReleaseReadinessReport['overallVerdict'] = 'READY_FOR_PRODUCTION';
    if (overallScore < 70 || sec.scorePercentage < 60) {
      verdict = 'BLOCKED';
    } else if (remediations.length > 0 || overallScore < 90) {
      verdict = 'NEEDS_REMEDIATION';
    }

    return {
      overallVerdict: verdict,
      readinessScorePercentage: overallScore,
      architectureHealth: arch,
      dependencyAnalysis: dep,
      configurationAudit: config,
      securityAudit: sec,
      performanceBenchmark: perf,
      loadTestResult: load,
      remediationsRequired: remediations,
      generatedAt: new Date().toISOString(),
    };
  }
}

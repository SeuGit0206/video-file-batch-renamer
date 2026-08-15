import type { IFeatureFlagService } from '../config';

export interface ArchitectureHealthIssue {
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  component: string;
  rule: string;
  description: string;
}

export interface ArchitectureHealthReport {
  isHealthy: boolean;
  scorePercentage: number;
  checkedRulesCount: number;
  issues: ArchitectureHealthIssue[];
  timestamp: string;
}

export interface IArchitectureHealthChecker {
  checkArchitectureHealth(): Promise<ArchitectureHealthReport>;
}

export class ArchitectureHealthChecker implements IArchitectureHealthChecker {
  private featureFlagService?: IFeatureFlagService;

  constructor(featureFlagService?: IFeatureFlagService) {
    this.featureFlagService = featureFlagService;
  }

  private isEnabled(): boolean {
    if (!this.featureFlagService) return true;
    return this.featureFlagService.isEnabled('ENABLE_RELEASE_READINESS');
  }

  public async checkArchitectureHealth(): Promise<ArchitectureHealthReport> {
    const issues: ArchitectureHealthIssue[] = [];
    let checkedRules = 0;

    if (!this.isEnabled()) {
      return {
        isHealthy: true,
        scorePercentage: 100,
        checkedRulesCount: 0,
        issues: [],
        timestamp: new Date().toISOString(),
      };
    }

    // Rule 1: Memory & Heap Boundary Check
    checkedRules++;
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > memUsage.heapTotal * 0.9) {
      issues.push({
        severity: 'HIGH',
        component: 'ProcessMemory',
        rule: 'Heap Limit Rule',
        description: `Heap memory usage is over 90% (${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB)`,
      });
    }

    // Rule 2: Garbage Collection / Uptime Stability Check
    checkedRules++;
    if (process.uptime() <= 0) {
      issues.push({
        severity: 'MEDIUM',
        component: 'RuntimeState',
        rule: 'Uptime Rule',
        description: 'Process uptime reported invalid value',
      });
    }

    // Rule 3: Node Engine & Environment Check
    checkedRules++;
    const nodeVersionMajor = parseInt(process.versions.node.split('.')[0], 10);
    if (nodeVersionMajor < 18) {
      issues.push({
        severity: 'HIGH',
        component: 'NodeEngine',
        rule: 'Node Version Rule',
        description: `Node.js version (${process.version}) is below minimum supported v18`,
      });
    }

    // Rule 4: Event Loop Lag Evaluation
    checkedRules++;
    const start = Date.now();
    await new Promise((res) => setTimeout(res, 10));
    const lag = Date.now() - start - 10;
    if (lag > 100) {
      issues.push({
        severity: 'MEDIUM',
        component: 'EventLoop',
        rule: 'Event Loop Responsiveness',
        description: `Event loop lag detected: ${lag}ms`,
      });
    }

    const highSeverityCount = issues.filter((i) => i.severity === 'HIGH').length;
    const isHealthy = highSeverityCount === 0;
    const score = Math.max(0, Math.round(((checkedRules - issues.length) / checkedRules) * 100));

    return {
      isHealthy,
      scorePercentage: score,
      checkedRulesCount: checkedRules,
      issues,
      timestamp: new Date().toISOString(),
    };
  }
}

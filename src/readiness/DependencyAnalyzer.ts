import fs from 'fs';
import path from 'path';

export interface DependencyIssue {
  dependencyName: string;
  version: string;
  type: 'OUTDATED' | 'SECURITY_RISK' | 'MISSING' | 'INVALID_SPEC';
  message: string;
}

export interface DependencyAnalysisReport {
  totalDependencies: number;
  totalDevDependencies: number;
  issuesCount: number;
  issues: DependencyIssue[];
  timestamp: string;
}

export interface IDependencyAnalyzer {
  analyzeDependencies(projectRoot?: string): Promise<DependencyAnalysisReport>;
}

export class DependencyAnalyzer implements IDependencyAnalyzer {
  public async analyzeDependencies(projectRoot: string = process.cwd()): Promise<DependencyAnalysisReport> {
    const pkgPath = path.join(projectRoot, 'package.json');
    const issues: DependencyIssue[] = [];

    if (!fs.existsSync(pkgPath)) {
      return {
        totalDependencies: 0,
        totalDevDependencies: 0,
        issuesCount: 1,
        issues: [
          {
            dependencyName: 'package.json',
            version: 'N/A',
            type: 'MISSING',
            message: 'package.json file was not found at project root',
          },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const raw = fs.readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(raw) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };

      const deps = pkg.dependencies || {};
      const devDeps = pkg.devDependencies || {};

      const checkVersionSpec = (name: string, ver: string) => {
        if (ver.includes('*') || ver === 'latest') {
          issues.push({
            dependencyName: name,
            version: ver,
            type: 'INVALID_SPEC',
            message: `Wildcard or 'latest' version specified for ${name} (${ver}), which may cause non-deterministic production builds`,
          });
        }
      };

      Object.entries(deps).forEach(([name, ver]) => checkVersionSpec(name, ver));
      Object.entries(devDeps).forEach(([name, ver]) => checkVersionSpec(name, ver));

      return {
        totalDependencies: Object.keys(deps).length,
        totalDevDependencies: Object.keys(devDeps).length,
        issuesCount: issues.length,
        issues,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        totalDependencies: 0,
        totalDevDependencies: 0,
        issuesCount: 1,
        issues: [
          {
            dependencyName: 'package.json',
            version: 'N/A',
            type: 'INVALID_SPEC',
            message: `Failed to parse package.json: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        timestamp: new Date().toISOString(),
      };
    }
  }
}

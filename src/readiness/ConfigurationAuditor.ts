import type { IFeatureFlagService } from '../config';

export interface ConfigurationAuditItem {
  key: string;
  value: string;
  status: 'OPTIMAL' | 'SUBOPTIMAL' | 'MISSING' | 'CRITICAL';
  recommendation?: string;
}

export interface ConfigurationAuditReport {
  isConfiguredForProduction: boolean;
  totalKeysChecked: number;
  items: ConfigurationAuditItem[];
  timestamp: string;
}

export interface IConfigurationAuditor {
  auditConfiguration(): Promise<ConfigurationAuditReport>;
}

export class ConfigurationAuditor implements IConfigurationAuditor {
  private featureFlagService?: IFeatureFlagService;

  constructor(featureFlagService?: IFeatureFlagService) {
    this.featureFlagService = featureFlagService;
  }

  public async auditConfiguration(): Promise<ConfigurationAuditReport> {
    const items: ConfigurationAuditItem[] = [];

    // Check 1: NODE_ENV
    const nodeEnv = process.env.NODE_ENV || 'development';
    items.push({
      key: 'NODE_ENV',
      value: nodeEnv,
      status: nodeEnv === 'production' ? 'OPTIMAL' : 'SUBOPTIMAL',
      recommendation: nodeEnv !== 'production' ? 'Set NODE_ENV=production for optimized performance' : undefined,
    });

    // Check 2: PORT
    const port = process.env.PORT || '3000';
    items.push({
      key: 'PORT',
      value: port,
      status: 'OPTIMAL',
    });

    // Check 3: PLAYWRIGHT_BROWSERS_PATH
    const pwPath = process.env.PLAYWRIGHT_BROWSERS_PATH || 'Not set';
    items.push({
      key: 'PLAYWRIGHT_BROWSERS_PATH',
      value: pwPath,
      status: process.env.PLAYWRIGHT_BROWSERS_PATH ? 'OPTIMAL' : 'SUBOPTIMAL',
      recommendation: !process.env.PLAYWRIGHT_BROWSERS_PATH ? 'Set PLAYWRIGHT_BROWSERS_PATH to workspace cache directory' : undefined,
    });

    // Check 4: Feature Flags Active
    if (this.featureFlagService) {
      const activeFlags = this.featureFlagService.getAllFlags();
      items.push({
        key: 'ACTIVE_FEATURE_FLAGS_COUNT',
        value: String(Object.keys(activeFlags).length),
        status: 'OPTIMAL',
      });
    }

    const suboptimals = items.filter((i) => i.status === 'SUBOPTIMAL' || i.status === 'CRITICAL').length;
    const isConfiguredForProduction = suboptimals === 0;

    return {
      isConfiguredForProduction,
      totalKeysChecked: items.length,
      items,
      timestamp: new Date().toISOString(),
    };
  }
}

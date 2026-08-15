/**
 * 統計情報関連の型定義
 */

export interface StatisticsSummary {
  totalCount: number;
  successCount: number;
  errorCount: number;
  pendingCount?: number;
  successRate: number;
  failureRate: number;
  averageProcessingTimeMs: number;
  averageSpeedRatio: number;
  totalBytesProcessed?: number;
  lastUpdated: string;
}

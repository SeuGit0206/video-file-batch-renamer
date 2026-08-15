import type { StatisticsSummary } from '../../types/statistics';

export interface ProcessRecord {
  success: boolean;
  durationMs?: number;
  speedRatio?: number;
  bytesProcessed?: number;
  isPending?: boolean;
}

/**
 * 処理結果統計を計算するサービス（副作用のない純粋関数として提供）
 */
export class StatisticsService {
  /**
   * 成功率 (%) を計算する (0 ~ 100)
   */
  public static getSuccessRate(total: number, success: number): number {
    if (total <= 0) return 0;
    const rate = (success / total) * 100;
    return Math.round(rate * 100) / 100;
  }

  /**
   * 失敗率 (%) を計算する (0 ~ 100)
   */
  public static getFailureRate(total: number, error: number): number {
    if (total <= 0) return 0;
    const rate = (error / total) * 100;
    return Math.round(rate * 100) / 100;
  }

  /**
   * 合計処理時間 (ms) を計算する
   */
  public static getTotalProcessingTime(items: { durationMs?: number }[]): number {
    if (!Array.isArray(items) || items.length === 0) return 0;
    return items.reduce((sum, item) => sum + (item.durationMs && item.durationMs > 0 ? item.durationMs : 0), 0);
  }

  /**
   * 平均処理時間 (ms) を計算する
   */
  public static getAverageProcessingTime(items: { durationMs?: number }[]): number {
    if (!Array.isArray(items) || items.length === 0) return 0;
    const validItems = items.filter((item) => typeof item.durationMs === 'number' && item.durationMs >= 0);
    if (validItems.length === 0) return 0;

    const total = validItems.reduce((sum, item) => sum + (item.durationMs || 0), 0);
    return Math.round((total / validItems.length) * 100) / 100;
  }

  /**
   * スループット (件 / 秒) を計算する
   */
  public static getThroughput(totalCount: number, totalDurationMs: number): number {
    if (totalCount <= 0 || totalDurationMs <= 0) return 0;
    const durationSeconds = totalDurationMs / 1000;
    const throughput = totalCount / durationSeconds;
    return Math.round(throughput * 100) / 100;
  }

  /**
   * レコード群から包括的な StatisticsSummary を計算する
   */
  public static calculateStatistics(items: ProcessRecord[]): StatisticsSummary {
    const lastUpdated = new Date().toISOString();

    if (!Array.isArray(items) || items.length === 0) {
      return {
        totalCount: 0,
        successCount: 0,
        errorCount: 0,
        pendingCount: 0,
        successRate: 0,
        failureRate: 0,
        averageProcessingTimeMs: 0,
        averageSpeedRatio: 0,
        totalBytesProcessed: 0,
        lastUpdated,
      };
    }

    const totalCount = items.length;
    let successCount = 0;
    let errorCount = 0;
    let pendingCount = 0;
    let totalBytes = 0;

    const validSpeedRatios: number[] = [];

    for (const item of items) {
      if (item.isPending) {
        pendingCount++;
      } else if (item.success) {
        successCount++;
      } else {
        errorCount++;
      }

      if (typeof item.bytesProcessed === 'number' && item.bytesProcessed > 0) {
        totalBytes += item.bytesProcessed;
      }

      if (typeof item.speedRatio === 'number' && item.speedRatio >= 0) {
        validSpeedRatios.push(item.speedRatio);
      }
    }

    const successRate = this.getSuccessRate(totalCount, successCount);
    const failureRate = this.getFailureRate(totalCount, errorCount);
    const averageProcessingTimeMs = this.getAverageProcessingTime(items);

    const averageSpeedRatio = validSpeedRatios.length > 0
      ? Math.round((validSpeedRatios.reduce((sum, r) => sum + r, 0) / validSpeedRatios.length) * 100) / 100
      : 0;

    return {
      totalCount,
      successCount,
      errorCount,
      pendingCount,
      successRate,
      failureRate,
      averageProcessingTimeMs,
      averageSpeedRatio,
      totalBytesProcessed: totalBytes,
      lastUpdated,
    };
  }
}

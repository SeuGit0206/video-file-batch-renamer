import { describe, expect, it } from 'vitest';
import { StatisticsService } from '../../../services/statistics/StatisticsService';
import type { ProcessRecord } from '../../../services/statistics/StatisticsService';

describe('StatisticsService', () => {
  describe('getSuccessRate', () => {
    it('総件数と成功件数からパーセンテージを正しく算出する', () => {
      expect(StatisticsService.getSuccessRate(10, 8)).toBe(80);
      expect(StatisticsService.getSuccessRate(3, 1)).toBe(33.33);
    });

    it('全成功の場合 100% を返す', () => {
      expect(StatisticsService.getSuccessRate(5, 5)).toBe(100);
    });

    it('全失敗の場合 0% を返す', () => {
      expect(StatisticsService.getSuccessRate(5, 0)).toBe(0);
    });

    it('ゼロ除算 (total <= 0) を安全に防止して 0 を返す', () => {
      expect(StatisticsService.getSuccessRate(0, 0)).toBe(0);
      expect(StatisticsService.getSuccessRate(-1, 0)).toBe(0);
    });
  });

  describe('getFailureRate', () => {
    it('総件数と失敗件数からパーセンテージを正しく算出する', () => {
      expect(StatisticsService.getFailureRate(10, 2)).toBe(20);
      expect(StatisticsService.getFailureRate(3, 2)).toBe(66.67);
    });

    it('ゼロ除算 (total <= 0) を安全に防止して 0 を返す', () => {
      expect(StatisticsService.getFailureRate(0, 5)).toBe(0);
    });
  });

  describe('getTotalProcessingTime', () => {
    it('アイテムの合計処理時間 (ms) を算出する', () => {
      const items = [{ durationMs: 100 }, { durationMs: 250 }, { durationMs: 50 }];
      expect(StatisticsService.getTotalProcessingTime(items)).toBe(400);
    });

    it('不正な時間値（負数・未定義）を無視して集計する', () => {
      const items = [{ durationMs: 100 }, { durationMs: -50 }, {}, { durationMs: 200 }];
      expect(StatisticsService.getTotalProcessingTime(items)).toBe(300);
    });

    it('空配列の場合 0 を返す', () => {
      expect(StatisticsService.getTotalProcessingTime([])).toBe(0);
    });
  });

  describe('getAverageProcessingTime', () => {
    it('平均処理時間 (ms) を算出する', () => {
      const items = [{ durationMs: 100 }, { durationMs: 200 }, { durationMs: 300 }];
      expect(StatisticsService.getAverageProcessingTime(items)).toBe(200);
    });

    it('空配列または有効時間がない場合 0 を返す', () => {
      expect(StatisticsService.getAverageProcessingTime([])).toBe(0);
      expect(StatisticsService.getAverageProcessingTime([{}, { durationMs: -100 }])).toBe(0);
    });
  });

  describe('getThroughput', () => {
    it('1秒あたりの処理件数 (Throughput) を算出する', () => {
      // 10件を5000ms (5秒) で処理 = 2件/秒
      expect(StatisticsService.getThroughput(10, 5000)).toBe(2);
      // 100件を3000ms (3秒) で処理 = 33.33件/秒
      expect(StatisticsService.getThroughput(100, 3000)).toBe(33.33);
    });

    it('ゼロ除算および無効な入力値に対して安全に 0 を返す', () => {
      expect(StatisticsService.getThroughput(10, 0)).toBe(0);
      expect(StatisticsService.getThroughput(0, 1000)).toBe(0);
      expect(StatisticsService.getThroughput(-5, 1000)).toBe(0);
    });
  });

  describe('calculateStatistics', () => {
    it('レコード群から総合統計要約 (StatisticsSummary) を正しく算出する', () => {
      const records: ProcessRecord[] = [
        { success: true, durationMs: 1000, speedRatio: 1.5, bytesProcessed: 1024 },
        { success: true, durationMs: 2000, speedRatio: 2.0, bytesProcessed: 2048 },
        { success: false, durationMs: 500, speedRatio: 0.5, bytesProcessed: 512 },
        { success: false, isPending: true, durationMs: 0 },
      ];

      const summary = StatisticsService.calculateStatistics(records);

      expect(summary.totalCount).toBe(4);
      expect(summary.successCount).toBe(2);
      expect(summary.errorCount).toBe(1);
      expect(summary.pendingCount).toBe(1);
      expect(summary.successRate).toBe(50); // 2/4 = 50%
      expect(summary.failureRate).toBe(25); // 1/4 = 25%
      expect(summary.averageProcessingTimeMs).toBe(875); // (1000+2000+500+0)/4 = 875
      expect(summary.averageSpeedRatio).toBe(1.33); // (1.5 + 2.0 + 0.5)/3 = 1.333... -> 1.33
      expect(summary.totalBytesProcessed).toBe(3584);
      expect(summary.lastUpdated).toBeDefined();
    });

    it('全成功レコードのパターンを正しく評価する', () => {
      const records: ProcessRecord[] = [
        { success: true, durationMs: 100 },
        { success: true, durationMs: 200 },
      ];

      const summary = StatisticsService.calculateStatistics(records);
      expect(summary.totalCount).toBe(2);
      expect(summary.successCount).toBe(2);
      expect(summary.errorCount).toBe(0);
      expect(summary.successRate).toBe(100);
      expect(summary.failureRate).toBe(0);
    });

    it('全失敗レコードのパターンを正しく評価する', () => {
      const records: ProcessRecord[] = [
        { success: false, durationMs: 100 },
        { success: false, durationMs: 200 },
      ];

      const summary = StatisticsService.calculateStatistics(records);
      expect(summary.totalCount).toBe(2);
      expect(summary.successCount).toBe(0);
      expect(summary.errorCount).toBe(2);
      expect(summary.successRate).toBe(0);
      expect(summary.failureRate).toBe(100);
    });

    it('空配列を安全に処理する', () => {
      const summary = StatisticsService.calculateStatistics([]);

      expect(summary.totalCount).toBe(0);
      expect(summary.successCount).toBe(0);
      expect(summary.errorCount).toBe(0);
      expect(summary.pendingCount).toBe(0);
      expect(summary.successRate).toBe(0);
      expect(summary.failureRate).toBe(0);
      expect(summary.averageProcessingTimeMs).toBe(0);
      expect(summary.averageSpeedRatio).toBe(0);
      expect(summary.totalBytesProcessed).toBe(0);
      expect(summary.lastUpdated).toBeDefined();
    });
  });
});

// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom';
import App from '../../App';
import { container } from '../../composition/container';

describe('Phase62 Export System Integration Test', () => {
  it('DIコンテナが正しくエクスポートサービスと統計サービスを解決できる', () => {
    const factory = container.getExportStrategyFactory();
    const statsService = container.getStatisticsService();

    expect(factory).toBeDefined();
    expect(statsService).toBeDefined();

    const csvService = factory.getService('csv');
    expect(csvService.format).toBe('csv');

    const stats = statsService.calculateStatistics([
      { success: true, isPending: false, bytesProcessed: 1024 },
      { success: false, isPending: false, bytesProcessed: 512 },
    ]);
    expect(stats.totalCount).toBe(2);
    expect(stats.successCount).toBe(1);
  });

  it('ヘッダーのエクスポートボタンからモーダルを開き、プレビューを表示できる', async () => {
    render(<App />);

    // Header のエクスポートボタンを取得
    const exportBtn = screen.getByRole('button', { name: 'エクスポート' });
    expect(exportBtn).toBeInTheDocument();

    // モーダルを開く
    fireEvent.click(exportBtn);
    expect(screen.getByText('データエクスポート')).toBeInTheDocument();

    // プレビュー実行
    const previewBtn = screen.getByRole('button', { name: 'プレビュー' });
    fireEvent.click(previewBtn);

    await waitFor(() => {
      expect(screen.getByText('エクスポートプレビュー (CSV)')).toBeInTheDocument();
    });

    // プレビュー画面の閉じるボタンを押す
    const closePreviewBtns = screen.getAllByRole('button', { name: '閉じる' });
    // PreviewDialog フッターの閉じるボタン(テキスト「閉じる」)
    const previewDialogCloseBtn = closePreviewBtns.find(btn => btn.textContent === '閉じる') || closePreviewBtns[0];
    fireEvent.click(previewDialogCloseBtn);

    await waitFor(() => {
      expect(screen.queryByText('エクスポートプレビュー (CSV)')).not.toBeInTheDocument();
    });

    // モーダルをキャンセルして閉じる
    const cancelBtn = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('データエクスポート')).not.toBeInTheDocument();
    });
  });
});

// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import { ExportButton } from '../../../components/export/ExportButton';
import { ExportModal } from '../../../components/export/ExportModal';
import { PreviewDialog } from '../../../components/export/PreviewDialog';
import type { ExportData } from '../../../types/export';

describe('ExportButton', () => {
  it('通常表示され、デフォルトラベルとカスタムクラスが適用される', () => {
    render(<ExportButton className="custom-class" />);
    const button = screen.getByRole('button', { name: 'データエクスポート' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('custom-class');
    expect(button).not.toBeDisabled();
  });

  it('カスタムラベルを正しく表示する', () => {
    render(<ExportButton label="エクスポートテスト" />);
    expect(screen.getByRole('button', { name: 'エクスポートテスト' })).toBeInTheDocument();
  });

  it('クリック時に onClick コールバックを発火する', () => {
    const handleClick = vi.fn();
    render(<ExportButton onClick={handleClick} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disabled 属性およびスタイルが正しく適用され、クリックが無視される', () => {
    const handleClick = vi.fn();
    render(<ExportButton disabled onClick={handleClick} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});

describe('PreviewDialog', () => {
  it('isOpen が false の場合はレンダリングされない', () => {
    const { container } = render(
      <PreviewDialog isOpen={false} onClose={vi.fn()} content="test" format="csv" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('CSV形式のコンテンツ、ファイル名、サイズ表記を正しく表示する (readonly)', () => {
    render(
      <PreviewDialog
        isOpen={true}
        onClose={vi.fn()}
        content="id,name\n1,VideoA.mp4"
        format="csv"
        filename="test_report.csv"
        sizeBytes={2048}
      />
    );

    expect(screen.getByText('エクスポートプレビュー (CSV)')).toBeInTheDocument();
    expect(screen.getByText('ファイル名: test_report.csv')).toBeInTheDocument();
    expect(screen.getByText(/2.0 KB \(2,048 bytes\)/)).toBeInTheDocument();
    expect(screen.getByText(/VideoA\.mp4/)).toBeInTheDocument();
  });

  it('JSON形式およびHTML形式のフォーマット表示を確認する', () => {
    const { rerender } = render(
      <PreviewDialog
        isOpen={true}
        onClose={vi.fn()}
        content='{"key": "value"}'
        format="json"
      />
    );
    expect(screen.getByText('エクスポートプレビュー (JSON)')).toBeInTheDocument();
    expect(screen.getByText('{"key": "value"}')).toBeInTheDocument();

    rerender(
      <PreviewDialog
        isOpen={true}
        onClose={vi.fn()}
        content="<h1>Report</h1>"
        format="html"
      />
    );
    expect(screen.getByText('エクスポートプレビュー (HTML)')).toBeInTheDocument();
    expect(screen.getByText('<h1>Report</h1>')).toBeInTheDocument();
  });

  it('空または長文コンテンツを安全に表示する', () => {
    const longContent = 'A'.repeat(5000);
    const { rerender } = render(
      <PreviewDialog isOpen={true} onClose={vi.fn()} content="" format="csv" />
    );
    expect(screen.getByText('(プレビューデータがありません)')).toBeInTheDocument();

    rerender(
      <PreviewDialog isOpen={true} onClose={vi.fn()} content={longContent} format="csv" />
    );
    expect(screen.getByText(longContent)).toBeInTheDocument();
  });

  it('ヘッダーの閉じるボタン(X)およびフッターの閉じるボタン押下で onClose が発火する', () => {
    const handleClose = vi.fn();
    render(
      <PreviewDialog isOpen={true} onClose={handleClose} content="test" format="json" />
    );

    const closeButtons = screen.getAllByRole('button', { name: '閉じる' });
    expect(closeButtons).toHaveLength(2);

    // ヘッダー閉じるボタン
    fireEvent.click(closeButtons[0]);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // フッター閉じるボタン
    fireEvent.click(closeButtons[1]);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});

describe('ExportModal', () => {
  it('isOpen が false の場合は表示されない', () => {
    const { container } = render(
      <ExportModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('isOpen が true の場合に初期要素が正しく描画される', () => {
    render(<ExportModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('データエクスポート')).toBeInTheDocument();
    expect(screen.getByLabelText('エクスポート対象')).toBeInTheDocument();
    expect(screen.getByText('CSV (.csv)')).toBeInTheDocument();
    expect(screen.getByText('JSON (.json)')).toBeInTheDocument();
    expect(screen.getByText('HTML レポート (.html)')).toBeInTheDocument();
  });

  it('ターゲット切替時に非対応フォーマットボタンが無効化・調整される (supportsTarget判定)', () => {
    render(<ExportModal isOpen={true} onClose={vi.fn()} />);

    const select = screen.getByLabelText('エクスポート対象') as HTMLSelectElement;
    
    // settings は JSON のみ対応
    fireEvent.change(select, { target: { value: 'settings' } });

    const csvBtn = screen.getByRole('button', { name: 'CSV (.csv)' });
    const htmlBtn = screen.getByRole('button', { name: 'HTML レポート (.html)' });
    const jsonBtn = screen.getByRole('button', { name: 'JSON (.json)' });

    expect(csvBtn).toBeDisabled();
    expect(htmlBtn).toBeDisabled();
    expect(jsonBtn).not.toBeDisabled();
  });

  it('キャンセルボタンおよびヘッダーXボタン押下で onClose が呼ばれる', () => {
    const handleClose = vi.fn();
    render(<ExportModal isOpen={true} onClose={handleClose} />);

    const cancelBtn = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const closeHeaderBtn = screen.getByRole('button', { name: '閉じる' });
    fireEvent.click(closeHeaderBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('プレビューボタン押下で PreviewDialog が開き、データを正しく受け渡す', async () => {
    const mockGetData = vi.fn().mockResolvedValue({
      title: 'mock_data',
      exportedAt: new Date().toISOString(),
      items: [{ id: 1, name: 'Item 1' }],
    } as ExportData);

    render(<ExportModal isOpen={true} onClose={vi.fn()} getDataForTarget={mockGetData} />);

    const previewBtn = screen.getByRole('button', { name: 'プレビュー' });
    fireEvent.click(previewBtn);

    await waitFor(() => {
      expect(mockGetData).toHaveBeenCalledWith('history');
      expect(screen.getByText('エクスポートプレビュー (CSV)')).toBeInTheDocument();
      expect(screen.getByText(/"id","name"/)).toBeInTheDocument();
    });
  });

  it('エクスポートボタン押下で成功時に onExportSuccess および onClose が発火する', async () => {
    const mockGetData = vi.fn().mockResolvedValue({
      title: 'export_test',
      exportedAt: new Date().toISOString(),
      items: [{ id: 100, name: 'Sample' }],
    } as ExportData);

    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <ExportModal
        isOpen={true}
        onClose={handleClose}
        getDataForTarget={mockGetData}
        onExportSuccess={handleSuccess}
      />
    );

    const exportBtn = screen.getByRole('button', { name: 'エクスポート' });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(mockGetData).toHaveBeenCalledWith('history');
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('データ取得エラー発生時にエラーメッセージを表示し、onExportError を呼び出す', async () => {
    const mockError = new Error('データ取得失敗エラー');
    const mockGetData = vi.fn().mockRejectedValue(mockError);
    const handleError = vi.fn();

    render(
      <ExportModal
        isOpen={true}
        onClose={vi.fn()}
        getDataForTarget={mockGetData}
        onExportError={handleError}
      />
    );

    const exportBtn = screen.getByRole('button', { name: 'エクスポート' });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(screen.getByText('データ取得失敗エラー')).toBeInTheDocument();
      expect(handleError).toHaveBeenCalledWith(mockError);
    });
  });
});


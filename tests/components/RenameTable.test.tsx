// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RenameTable } from '../../src/components/RenameTable';
import type { VideoFile } from '../../src/types';

describe('RenameTable Component', () => {
  const mockFiles: VideoFile[] = [
    {
      id: '1',
      originalName: 'test_video_1.mp4',
      extractedId: 'ABC-123',
      status: 'pending',
      isSelected: false,
    },
    {
      id: '2',
      originalName: 'test_video_2.mp4',
      extractedId: 'DEF-456',
      status: 'completed',
      isSelected: true,
      metadata: {
        productId: 'DEF-456',
        title: 'Test Movie 2',
      },
    },
  ];

  const createProps = (files: VideoFile[], overrides: Partial<React.ComponentProps<typeof RenameTable>> = {}) => ({
    files,
    selectedFileId: null,
    setSelectedFileId: vi.fn(),
    fileSearchQuery: '',
    setFileSearchQuery: vi.fn(),
    fileStatusFilter: 'All',
    setFileStatusFilter: vi.fn(),
    fileSortBy: 'originalName',
    setFileSortBy: vi.fn(),
    fileSortOrder: 'asc' as const,
    setFileSortOrder: vi.fn(),
    dragActive: false,
    handleDragEnter: vi.fn(),
    handleDragOver: vi.fn(),
    handleDragLeave: vi.fn(),
    handleDrop: vi.fn(),
    handleSelectAll: vi.fn(),
    handleSelectFile: vi.fn(),
    handleSingleRefreshMetadata: vi.fn(),
    handleSingleRenameFile: vi.fn(),
    getFormattedPreviewName: (file: VideoFile) => `renamed-${file.originalName}`,
    openTroubleshootingModal: vi.fn(),
    ...overrides,
  });

  it('renders table headers and file rows correctly', () => {
    const setSelectedFileId = vi.fn();
    const setFileSearchQuery = vi.fn();
    const setFileStatusFilter = vi.fn();
    const setFileSortBy = vi.fn();
    const setFileSortOrder = vi.fn();
    const handleDragOver = vi.fn();
    const handleDragEnter = vi.fn();
    const handleDragLeave = vi.fn();
    const handleDrop = vi.fn();
    const handleSelectAll = vi.fn();
    const handleSelectFile = vi.fn();
    const handleSingleRefreshMetadata = vi.fn();
    const handleSingleRenameFile = vi.fn();
    const getFormattedPreviewName = vi.fn((file: VideoFile) => `Formatted_${file.originalName}`);
    const openTroubleshootingModal = vi.fn();

    render(
      <RenameTable
        files={mockFiles}
        selectedFileId="1"
        setSelectedFileId={setSelectedFileId}
        fileSearchQuery=""
        setFileSearchQuery={setFileSearchQuery}
        fileStatusFilter="All"
        setFileStatusFilter={setFileStatusFilter}
        fileSortBy="originalName"
        setFileSortBy={setFileSortBy}
        fileSortOrder="asc"
        setFileSortOrder={setFileSortOrder}
        dragActive={false}
        handleDragEnter={handleDragEnter}
        handleDragOver={handleDragOver}
        handleDragLeave={handleDragLeave}
        handleDrop={handleDrop}
        handleSelectAll={handleSelectAll}
        handleSelectFile={handleSelectFile}
        handleSingleRefreshMetadata={handleSingleRefreshMetadata}
        handleSingleRenameFile={handleSingleRenameFile}
        getFormattedPreviewName={getFormattedPreviewName}
        openTroubleshootingModal={openTroubleshootingModal}
      />
    );

    expect(screen.getAllByText('test_video_1.mp4').length).toBeGreaterThan(0);
    expect(screen.getAllByText('test_video_2.mp4').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ABC-123').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DEF-456').length).toBeGreaterThan(0);

    const searchInput = screen.getByPlaceholderText('ファイル名・作品ID・タイトルで絞り込み...') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'ABC' } });
    expect(setFileSearchQuery).toHaveBeenCalledWith('ABC');

    // Quick Status Filter Buttons validation
    const allButton = screen.getByRole('button', { name: /すべて \(2\)/ });
    const completedButton = screen.getByRole('button', { name: /完了 \(1\)/ });
    const incompleteButton = screen.getByRole('button', { name: /未取得\/品番のみ \(1\)/ });

    expect(allButton).toBeDefined();
    expect(completedButton).toBeDefined();
    expect(incompleteButton).toBeDefined();

    fireEvent.click(completedButton);
    expect(setFileStatusFilter).toHaveBeenCalledWith('completed');

    fireEvent.click(incompleteButton);
    expect(setFileStatusFilter).toHaveBeenCalledWith('incomplete');

    fireEvent.click(allButton);
    expect(setFileStatusFilter).toHaveBeenCalledWith('All');
  });

  it('商品IDまたはタイトルに一致するファイルだけを大文字小文字を区別せず表示する', () => {
    const files: VideoFile[] = [
      { id: 'id-match', originalName: 'first.mp4', extractedId: 'ABC-123', status: 'completed' },
      {
        id: 'title-match',
        originalName: 'second.mp4',
        extractedId: 'XYZ-456',
        status: 'completed',
        metadata: { productId: 'XYZ-456', title: 'Special Movie' },
      },
      { id: 'unmatched', originalName: 'third.mp4', extractedId: 'ZZZ-999', status: 'completed' },
    ];
    const { rerender } = render(<RenameTable {...createProps(files, { fileSearchQuery: 'abc-123' })} />);

    expect(screen.getAllByText('first.mp4').length).toBeGreaterThan(0);
    expect(screen.queryByText('second.mp4')).toBeNull();
    expect(screen.queryByText('third.mp4')).toBeNull();

    rerender(<RenameTable {...createProps(files, { fileSearchQuery: 'SPECIAL movie' })} />);

    expect(screen.queryByText('first.mp4')).toBeNull();
    expect(screen.getAllByText('second.mp4').length).toBeGreaterThan(0);
    expect(screen.queryByText('third.mp4')).toBeNull();
  });

  it('完了・未完了・すべての絞り込みに応じて表示対象を切り替える', () => {
    const files: VideoFile[] = [
      { id: 'completed', originalName: 'completed.mp4', status: 'completed' },
      { id: 'pending', originalName: 'pending.mp4', status: 'pending' },
      { id: 'error', originalName: 'error.mp4', status: 'error' },
    ];
    const { rerender } = render(<RenameTable {...createProps(files, { fileStatusFilter: 'completed' })} />);

    expect(screen.getAllByText('completed.mp4').length).toBeGreaterThan(0);
    expect(screen.queryByText('pending.mp4')).toBeNull();
    expect(screen.queryByText('error.mp4')).toBeNull();

    rerender(<RenameTable {...createProps(files, { fileStatusFilter: 'incomplete' })} />);
    expect(screen.queryByText('completed.mp4')).toBeNull();
    expect(screen.getAllByText('pending.mp4').length).toBeGreaterThan(0);
    expect(screen.getAllByText('error.mp4').length).toBeGreaterThan(0);

    rerender(<RenameTable {...createProps(files, { fileStatusFilter: 'All' })} />);
    expect(screen.getAllByText('completed.mp4').length).toBeGreaterThan(0);
    expect(screen.getAllByText('pending.mp4').length).toBeGreaterThan(0);
    expect(screen.getAllByText('error.mp4').length).toBeGreaterThan(0);
  });

  it('50件を超える場合は表示範囲内だけを描画し、表示中のファイルを選択できる', () => {
    const files: VideoFile[] = Array.from({ length: 55 }, (_, index) => ({
      id: `file-${index + 1}`,
      originalName: `video-${String(index + 1).padStart(2, '0')}.mp4`,
      status: 'completed' as const,
    }));
    const setSelectedFileId = vi.fn();
    render(<RenameTable {...createProps(files, { setSelectedFileId })} />);

    expect(screen.getAllByText('video-01.mp4').length).toBeGreaterThan(0);
    expect(screen.queryByText('video-55.mp4')).toBeNull();

    fireEvent.click(screen.getAllByText('video-01.mp4')[0]);
    expect(setSelectedFileId).toHaveBeenCalledOnce();
    expect(setSelectedFileId).toHaveBeenCalledWith('file-1');
  });
});

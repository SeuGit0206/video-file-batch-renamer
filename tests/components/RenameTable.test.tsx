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

  it('renders table headers and file rows correctly', () => {
    const setSelectedFileId = vi.fn();
    const setFileSearchQuery = vi.fn();
    const setFileStatusFilter = vi.fn();
    const setFileSortBy = vi.fn();
    const setFileSortOrder = vi.fn();
    const handleDragOver = vi.fn();
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
});

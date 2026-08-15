// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RenamePreview } from '../../src/components/RenamePreview';
import type { VideoFile } from '../../src/types';

describe('RenamePreview Component', () => {
  it('renders info message when no file is selected', () => {
    const getFormattedPreviewName = vi.fn();
    render(
      <RenamePreview
        selectedFile={null}
        getFormattedPreviewName={getFormattedPreviewName}
      />
    );

    expect(
      screen.getByText(
        'テーブルからファイルを選択すると、取得した詳細メタデータ（タイトル・出演者・発売日・サムネイル）がここに表示されます。'
      )
    ).toBeTruthy();
  });

  it('renders file details and metadata when selectedFile is provided', () => {
    const mockFile: VideoFile = {
      id: 'file-1',
      originalName: 'SSIS-123_sample.mp4',
      extractedId: 'SSIS-123',
      status: 'completed',
      metadata: {
        productId: 'SSIS-123',
        title: 'Sample Movie Title',
        actress: 'Yui Hatano',
        releaseDate: '2026-08-01',
        series: 'S1 Series',
        coverImageUrl: 'https://example.com/cover.jpg',
      },
    };

    const getFormattedPreviewName = vi.fn().mockReturnValue('Yui Hatano/SSIS-123_Sample Movie Title.mp4');

    render(
      <RenamePreview
        selectedFile={mockFile}
        getFormattedPreviewName={getFormattedPreviewName}
      />
    );

    expect(screen.getByText('SSIS-123_sample.mp4')).toBeTruthy();
    expect(screen.getByText('Yui Hatano/SSIS-123_Sample Movie Title.mp4')).toBeTruthy();
    expect(screen.getByText('Sample Movie Title')).toBeTruthy();
    expect(screen.getByText('Yui Hatano')).toBeTruthy();
    expect(screen.getByText('2026-08-01')).toBeTruthy();
  });
});

// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MetadataEditModal } from '../../src/components/MetadataEditModal';
import type { VideoFile } from '../../src/types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('MetadataEditModal', () => {
  it('タイトルと作品IDがない場合はエラーを表示して保存しない', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const file: VideoFile = {
      id: 'file-1',
      originalName: 'unknown.mp4',
      status: 'completed',
    };

    render(<MetadataEditModal isOpen file={file} onSave={onSave} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: '保存して更新' }));

    expect(screen.getByText('タイトルまたは作品IDが必要です')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('入力値を整えて保存し、関係のない既存メタデータを保持する', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const debug = {
      finalUrl: 'https://example.test/item/ABC-123',
      pageTitle: '取得時タイトル',
      htmlLength: 123,
      htmlPreview: '<main>preview</main>',
      bodyPreview: 'preview',
    };
    const file: VideoFile = {
      id: 'file-2',
      originalName: 'ABC-123.mp4',
      extractedId: 'ABC-123',
      status: 'completed',
      metadata: {
        productId: 'OLD-999',
        title: '旧タイトル',
        actress: '旧出演者',
        releaseDate: '2025-01-01',
        series: '旧シリーズ',
        maker: '旧メーカー',
        thumbnail: 'https://example.test/thumbnail.jpg',
        source: 'existing-source',
        debug,
      },
    };

    render(<MetadataEditModal isOpen file={file} onSave={onSave} onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText('例: 豪華サンプル作品'), { target: { value: '  新タイトル  ' } });
    fireEvent.change(screen.getByPlaceholderText('例: 女優A, 女優B'), { target: { value: '  出演者A  ' } });
    fireEvent.change(screen.getByPlaceholderText('例: 2026-08-10'), { target: { value: '  2026-09-13  ' } });
    fireEvent.change(screen.getByPlaceholderText('例: S1 NO.1 STYLE'), { target: { value: '  新メーカー  ' } });
    fireEvent.change(screen.getByPlaceholderText('例: シリーズX'), { target: { value: '  新シリーズ  ' } });
    fireEvent.click(screen.getByRole('button', { name: '保存して更新' }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith('file-2', expect.objectContaining({
      productId: 'ABC-123',
      title: '新タイトル',
      actress: '出演者A',
      releaseDate: '2026-09-13',
      series: '新シリーズ',
      maker: '新メーカー',
      thumbnail: 'https://example.test/thumbnail.jpg',
      source: 'existing-source',
      debug,
      isUserEdited: true,
    }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('編集対象を切り替えると前のエラーと入力内容を残さない', () => {
    const firstFile: VideoFile = {
      id: 'file-1',
      originalName: 'unknown.mp4',
      status: 'completed',
    };
    const secondFile: VideoFile = {
      id: 'file-2',
      originalName: 'XYZ-456.mp4',
      extractedId: 'XYZ-456',
      status: 'completed',
      metadata: { productId: 'XYZ-456', title: '切替後タイトル', actress: '切替後出演者' },
    };
    const props = { isOpen: true, onSave: vi.fn(), onClose: vi.fn() };
    const { rerender } = render(<MetadataEditModal {...props} file={firstFile} />);

    fireEvent.change(screen.getByPlaceholderText('例: 豪華サンプル作品'), { target: { value: '一時入力' } });
    fireEvent.change(screen.getByPlaceholderText('例: 豪華サンプル作品'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: '保存して更新' }));
    expect(screen.getByText('タイトルまたは作品IDが必要です')).toBeTruthy();

    rerender(<MetadataEditModal {...props} file={secondFile} />);

    expect(screen.queryByText('タイトルまたは作品IDが必要です')).toBeNull();
    expect((screen.getByPlaceholderText('例: 豪華サンプル作品') as HTMLInputElement).value).toBe('切替後タイトル');
    expect((screen.getByPlaceholderText('例: 女優A, 女優B') as HTMLInputElement).value).toBe('切替後出演者');
    expect(screen.getByText('XYZ-456.mp4')).toBeTruthy();
  });
});

// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import type { DragEvent } from 'react';
import { describe, expect, it } from 'vitest';
import { useVideoFileList } from '../../../hooks/useVideoFileList';
import type { VideoFile } from '../../../types';

describe('useVideoFileList Hook', () => {
  const customInitial: VideoFile[] = [
    {
      id: 'f1',
      originalName: 'SSNI-001.mp4',
      extractedId: 'SSNI-001',
      status: 'pending',
      isSelected: false,
    },
    {
      id: 'f2',
      originalName: 'MIDV-123.mp4',
      extractedId: 'MIDV-123',
      status: 'completed',
      isSelected: true,
    },
  ];

  it('デフォルトで空のファイル一覧が初期化される', () => {
    const { result } = renderHook(() => useVideoFileList());
    expect(result.current.files.length).toBe(0);
    expect(result.current.selectedFileId).toBeNull();
    expect(result.current.selectedFile).toBeNull();
  });

  it('初期ファイル一覧および選択状態が正しく設定される', () => {
    const { result } = renderHook(() => useVideoFileList({ initialFiles: customInitial }));
    expect(result.current.files.length).toBe(2);
    expect(result.current.files[0].originalName).toBe('SSNI-001.mp4');
    expect(result.current.selectedFileId).toBeNull();
    expect(result.current.selectedFile).toBeNull();
  });

  it('selectedFileId が設定されると selectedFile が正しく参照される', () => {
    const { result } = renderHook(() => useVideoFileList({ initialFiles: customInitial }));

    act(() => {
      result.current.setSelectedFileId('f2');
    });

    expect(result.current.selectedFileId).toBe('f2');
    expect(result.current.selectedFile?.originalName).toBe('MIDV-123.mp4');
  });

  it('handleSelectAll で全ファイルの選択状態が一括切り替えされる', () => {
    const { result } = renderHook(() => useVideoFileList({ initialFiles: customInitial }));

    act(() => {
      result.current.handleSelectAll(true);
    });

    expect(result.current.files.every(f => f.isSelected)).toBe(true);

    act(() => {
      result.current.handleSelectAll(false);
    });

    expect(result.current.files.every(f => !f.isSelected)).toBe(true);
  });

  it('handleSelectFile で特定ファイルの選択状態が切り替わる', () => {
    const { result } = renderHook(() => useVideoFileList({ initialFiles: customInitial }));

    act(() => {
      result.current.handleSelectFile('f1', true);
    });

    expect(result.current.files.find(f => f.id === 'f1')?.isSelected).toBe(true);
    expect(result.current.files.find(f => f.id === 'f2')?.isSelected).toBe(true);
  });

  it('handleUpdateFile で特定ファイルのプロパティが更新される', () => {
    const { result } = renderHook(() => useVideoFileList({ initialFiles: customInitial }));

    act(() => {
      result.current.handleUpdateFile('f1', { status: 'completed', errorMessage: undefined });
    });

    expect(result.current.files.find(f => f.id === 'f1')?.status).toBe('completed');
  });

  it('handleRemoveFile でファイルが削除され、選択中ファイルの場合は selectedFileId が解除される', () => {
    const { result } = renderHook(() => useVideoFileList({ initialFiles: customInitial }));

    act(() => {
      result.current.setSelectedFileId('f1');
    });
    expect(result.current.selectedFileId).toBe('f1');

    act(() => {
      result.current.handleRemoveFile('f1');
    });

    expect(result.current.files.length).toBe(1);
    expect(result.current.files.find(f => f.id === 'f1')).toBeUndefined();
    expect(result.current.selectedFileId).toBeNull();
  });

  it('handleResetFiles および handleClearFiles が正しく動作する', () => {
    const { result } = renderHook(() => useVideoFileList({ initialFiles: customInitial }));

    act(() => {
      result.current.handleClearFiles();
    });
    expect(result.current.files.length).toBe(0);

    act(() => {
      result.current.handleResetFiles();
    });
    expect(result.current.files.length).toBe(2);
  });

  it('addDroppedFiles で動画ファイルのみが追加され、非動画や重複は除外される', () => {
    const { result } = renderHook(() => useVideoFileList({ initialFiles: customInitial }));

    act(() => {
      const added = result.current.addDroppedFiles(
        [
          { name: 'TEST-100.mp4', size: 1024000 },
          { name: 'UNKNOWN_FILE.avi', size: 500000 },
          { name: 'document.txt', size: 100 }, // non-video
          { name: 'SSNI-001.mp4', size: 2000 }, // duplicate
        ],
        (name) => (name.includes('TEST-100') ? 'TEST-100' : '')
      );
      expect(added.length).toBe(2);
      expect(added[0].status).toBe('pending');
      expect(added[1].status).toBe('NotFound');
    });

    expect(result.current.files.length).toBe(4);
  });

  it('検索・フィルタ・ソートの状態変更が反映される', () => {
    const { result } = renderHook(() => useVideoFileList({ initialFiles: customInitial }));

    act(() => {
      result.current.setFileSearchQuery('SSNI');
      result.current.setFileStatusFilter('completed');
      result.current.setFileSortBy('extractedId');
      result.current.setFileSortOrder('desc');
    });

    expect(result.current.fileSearchQuery).toBe('SSNI');
    expect(result.current.fileStatusFilter).toBe('completed');
    expect(result.current.fileSortBy).toBe('extractedId');
    expect(result.current.fileSortOrder).toBe('desc');
  });

  it('ドラッグ＆ドロップイベントで dragActive が更新されドロップハンドラが動作する', async () => {
    const { result } = renderHook(() => useVideoFileList({ initialFiles: customInitial }));

    const fakeEvent = {
      preventDefault: () => {},
      stopPropagation: () => {},
      dataTransfer: {
        files: [
          { name: 'DROPPED-001.mp4', size: 2048 },
        ],
      },
    } as unknown as DragEvent;

    act(() => {
      result.current.handleDragOver(fakeEvent);
    });
    expect(result.current.dragActive).toBe(true);

    act(() => {
      result.current.handleDragLeave(fakeEvent);
    });
    expect(result.current.dragActive).toBe(false);

    let droppedCount = 0;
    await act(async () => {
      await result.current.handleDrop(fakeEvent, undefined, (count) => {
        droppedCount = count;
      });
    });

    expect(result.current.dragActive).toBe(false);
    expect(droppedCount).toBe(1);
    expect(result.current.files.length).toBe(3);
  });

  it('filteredAndSortedFiles で検索・フィルタ・ソートされた結果が正しく計算される', () => {
    const list: VideoFile[] = [
      { id: '1', originalName: 'B_FILE.mp4', extractedId: 'B-002', status: 'completed', isSelected: false },
      { id: '2', originalName: 'A_FILE.mp4', extractedId: 'A-001', status: 'pending', isSelected: false },
      { id: '3', originalName: 'C_FILE.mp4', extractedId: 'C-003', status: 'NotFound', isSelected: false },
    ];
    const { result } = renderHook(() => useVideoFileList({ initialFiles: list }));

    // 初期ソート: originalName asc -> A_FILE, B_FILE, C_FILE
    expect(result.current.filteredAndSortedFiles.map(f => f.id)).toEqual(['2', '1', '3']);

    // フィルタ: status = 'completed'
    act(() => {
      result.current.setFileStatusFilter('completed');
    });
    expect(result.current.filteredAndSortedFiles.length).toBe(1);
    expect(result.current.filteredAndSortedFiles[0].id).toBe('1');

    // フィルタ解除 + 検索: 'C_FILE'
    act(() => {
      result.current.setFileStatusFilter('All');
      result.current.setFileSearchQuery('C_FILE');
    });
    expect(result.current.filteredAndSortedFiles.length).toBe(1);
    expect(result.current.filteredAndSortedFiles[0].id).toBe('3');

    // 検索解除 + ソート: extractedId desc -> C-003, B-002, A-001
    act(() => {
      result.current.setFileSearchQuery('');
      result.current.setFileSortBy('extractedId');
      result.current.setFileSortOrder('desc');
    });
    expect(result.current.filteredAndSortedFiles.map(f => f.id)).toEqual(['3', '1', '2']);
  });
});

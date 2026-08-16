// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { useMetadataSync } from '../../../hooks/useMetadataSync';

describe('useMetadataSync Hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('初期状態では空オブジェクトまたはlocalStorageからキャッシュを読み込む', () => {
    localStorage.setItem('video_renamer_meta_cache', JSON.stringify({
      'TEST-001': { title: 'Cached Title', actress: 'Actress A' }
    }));

    const { result } = renderHook(() => useMetadataSync());
    expect(result.current.metadataCache['TEST-001']).toEqual({
      title: 'Cached Title',
      actress: 'Actress A'
    });
  });

  it('updateMetadataCache で新しいメタデータを追加・更新しlocalStorageに保存される', () => {
    const { result } = renderHook(() => useMetadataSync());

    act(() => {
      result.current.updateMetadataCache('ABC-123', {
        title: 'New Video Title',
        actress: 'Actress B'
      });
    });

    expect(result.current.metadataCache['ABC-123']).toEqual({
      title: 'New Video Title',
      actress: 'Actress B'
    });

    const stored = JSON.parse(localStorage.getItem('video_renamer_meta_cache') || '{}');
    expect(stored['ABC-123']).toEqual({
      title: 'New Video Title',
      actress: 'Actress B'
    });
  });

  it('invalidateMetadataCache で指定IDのキャッシュが削除される', () => {
    const { result } = renderHook(() => useMetadataSync());

    act(() => {
      result.current.updateMetadataCache('ABC-123', { title: 'Title 1' });
      result.current.updateMetadataCache('XYZ-999', { title: 'Title 2' });
    });

    act(() => {
      result.current.invalidateMetadataCache('ABC-123');
    });

    expect(result.current.metadataCache['ABC-123']).toBeUndefined();
    expect(result.current.metadataCache['XYZ-999']).toEqual({ title: 'Title 2' });
  });

  it('clearMetadataCache で全てのキャッシュがクリアされる', () => {
    const { result } = renderHook(() => useMetadataSync());

    act(() => {
      result.current.updateMetadataCache('ABC-123', { title: 'Title 1' });
    });

    act(() => {
      result.current.clearMetadataCache();
    });

    expect(result.current.metadataCache).toEqual({});
  });
});

// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts Hook', () => {
  it('Escape キーで onCloseAllModals が呼ばれる', () => {
    const onCloseAllModals = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onCloseAllModals }));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onCloseAllModals).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+Shift+E で onOpenRenameExecutionModal が呼ばれる', () => {
    const onOpenRenameExecutionModal = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onOpenRenameExecutionModal }));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'E', ctrlKey: true, shiftKey: true }));
    expect(onOpenRenameExecutionModal).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+I で onOpenImportModal が呼ばれる', () => {
    const onOpenImportModal = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onOpenImportModal }));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', ctrlKey: true }));
    expect(onOpenImportModal).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+R で onOpenRuleEditor が呼ばれる', () => {
    const onOpenRuleEditor = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onOpenRuleEditor }));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', ctrlKey: true }));
    expect(onOpenRuleEditor).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+E (Shiftなし) で onOpenExportModal が呼ばれる', () => {
    const onOpenExportModal = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onOpenExportModal }));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', ctrlKey: true }));
    expect(onOpenExportModal).toHaveBeenCalledTimes(1);
  });

  it('アンマウント時にイベントリスナーが解除される', () => {
    const onCloseAllModals = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ onCloseAllModals }));

    unmount();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onCloseAllModals).not.toHaveBeenCalled();
  });
});

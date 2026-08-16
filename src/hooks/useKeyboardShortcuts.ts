import { useEffect, useRef } from 'react';

export interface KeyboardShortcutHandlers {
  onCloseAllModals?: () => void;
  onOpenRenameExecutionModal?: () => void;
  onOpenImportModal?: () => void;
  onOpenRuleEditor?: () => void;
  onOpenExportModal?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);

      if (e.key === 'Escape') {
        handlersRef.current.onCloseAllModals?.();
        return;
      }

      if (isInput) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey && e.key.toUpperCase() === 'E') {
          e.preventDefault();
          handlersRef.current.onOpenRenameExecutionModal?.();
        } else if (e.key.toUpperCase() === 'I') {
          e.preventDefault();
          handlersRef.current.onOpenImportModal?.();
        } else if (e.key.toUpperCase() === 'R') {
          e.preventDefault();
          handlersRef.current.onOpenRuleEditor?.();
        } else if (e.key.toUpperCase() === 'E') {
          e.preventDefault();
          handlersRef.current.onOpenExportModal?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}

import type { RenameTransactionRecord, UndoRedoStackState } from '../../types/rename';

export interface IRenameUndoRedoManager {
  pushTransaction(record: RenameTransactionRecord): void;
  undo(): RenameTransactionRecord | null;
  redo(): RenameTransactionRecord | null;
  canUndo(): boolean;
  canRedo(): boolean;
  getState(): UndoRedoStackState;
  clear(): void;
}

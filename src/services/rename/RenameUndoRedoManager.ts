import type { IRenameUndoRedoManager } from './IRenameUndoRedoManager';
import type { RenameTransactionRecord, UndoRedoStackState, RenameResultItem } from '../../types/rename';

export class RenameUndoRedoManager implements IRenameUndoRedoManager {
  private undoStack: RenameTransactionRecord[] = [];
  private redoStack: RenameTransactionRecord[] = [];
  private maxHistorySize: number;

  constructor(maxHistorySize = 50) {
    this.maxHistorySize = maxHistorySize;
  }

  public pushTransaction(record: RenameTransactionRecord): void {
    if (!record.canUndo || record.items.length === 0) {
      return;
    }

    this.undoStack.push(record);
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    // 新しい操作が追加されたらRedoスタックをクリア
    this.redoStack = [];
  }

  public undo(): RenameTransactionRecord | null {
    if (!this.canUndo()) {
      return null;
    }

    const record = this.undoStack.pop();
    if (!record) {
      return null;
    }

    // 逆操作レコードの構築
    const timestamp = new Date().toISOString();
    const invertedItems: RenameResultItem[] = record.items
      .filter((item) => item.success)
      .map((item) => ({
        id: item.id,
        originalName: item.newName,
        newName: item.originalName,
        success: true,
        timestamp,
      }));

    const invertedRecord: RenameTransactionRecord = {
      transactionId: `undo_${record.transactionId}_${Date.now()}`,
      timestamp,
      items: invertedItems,
      status: 'completed',
      canUndo: true,
    };

    // Redoスタックに元のレコードを追加
    this.redoStack.push(record);

    return invertedRecord;
  }

  public redo(): RenameTransactionRecord | null {
    if (!this.canRedo()) {
      return null;
    }

    const record = this.redoStack.pop();
    if (!record) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const redoRecord: RenameTransactionRecord = {
      transactionId: `redo_${record.transactionId}_${Date.now()}`,
      timestamp,
      items: record.items,
      status: 'completed',
      canUndo: true,
    };

    // Undoスタックに元のレコードを戻す
    this.undoStack.push(record);

    return redoRecord;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getState(): UndoRedoStackState {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
    };
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

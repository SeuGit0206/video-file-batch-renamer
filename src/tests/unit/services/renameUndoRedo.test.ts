import { describe, expect, it } from 'vitest';
import { RenameUndoRedoManager } from '../../../services/rename/RenameUndoRedoManager';
import type { RenameTransactionRecord } from '../../../types/rename';

describe('RenameUndoRedoManager Unit Test', () => {
  const createSampleRecord = (id: string): RenameTransactionRecord => ({
    transactionId: id,
    timestamp: new Date().toISOString(),
    status: 'completed',
    canUndo: true,
    items: [
      {
        id: 'file-1',
        originalName: 'fileA.mp4',
        newName: 'fileA_renamed.mp4',
        success: true,
        timestamp: new Date().toISOString(),
      },
    ],
  });

  it('初期状態では canUndo/canRedo が false である', () => {
    const manager = new RenameUndoRedoManager();
    const state = manager.getState();

    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
    expect(state.undoCount).toBe(0);
    expect(state.redoCount).toBe(0);
  });

  it('トランザクションをプッシュすると Undo が可能になる', () => {
    const manager = new RenameUndoRedoManager();
    manager.pushTransaction(createSampleRecord('tx-1'));

    expect(manager.canUndo()).toBe(true);
    expect(manager.getState().undoCount).toBe(1);
  });

  it('Undo 実行時に逆操作レコードが生成され、Redo が可能になる', () => {
    const manager = new RenameUndoRedoManager();
    manager.pushTransaction(createSampleRecord('tx-1'));

    const undoRecord = manager.undo();

    expect(undoRecord).not.toBeNull();
    expect(undoRecord?.items[0].originalName).toBe('fileA_renamed.mp4');
    expect(undoRecord?.items[0].newName).toBe('fileA.mp4');
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(true);
  });

  it('Redo 実行時に元の操作レコードが復元される', () => {
    const manager = new RenameUndoRedoManager();
    manager.pushTransaction(createSampleRecord('tx-1'));
    manager.undo();

    const redoRecord = manager.redo();

    expect(redoRecord).not.toBeNull();
    expect(redoRecord?.items[0].originalName).toBe('fileA.mp4');
    expect(redoRecord?.items[0].newName).toBe('fileA_renamed.mp4');
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
  });

  it('新規トランザクションプッシュ時に Redo スタックがクリアされる', () => {
    const manager = new RenameUndoRedoManager();
    manager.pushTransaction(createSampleRecord('tx-1'));
    manager.undo();
    expect(manager.canRedo()).toBe(true);

    manager.pushTransaction(createSampleRecord('tx-2'));
    expect(manager.canRedo()).toBe(false);
    expect(manager.getState().undoCount).toBe(1);
  });

  it('clear で全スタックがリセットされる', () => {
    const manager = new RenameUndoRedoManager();
    manager.pushTransaction(createSampleRecord('tx-1'));
    manager.clear();

    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(false);
  });
});

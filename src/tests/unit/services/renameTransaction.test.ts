import { describe, expect, it } from 'vitest';
import { RenameExecutionService } from '../../../services/rename/RenameExecutionService';
import { RenameTransaction } from '../../../services/rename/RenameTransaction';
import type { RenameItem } from '../../../types/rename';

describe('RenameTransaction Unit Test', () => {
  const executionService = new RenameExecutionService();
  const transaction = new RenameTransaction(executionService);

  it('全件成功のトランザクションが正しく完了状態を記録する', () => {
    const items: RenameItem[] = [
      { id: '1', originalName: 'doc1.pdf', proposedName: 'renamed_doc1.pdf', status: 'pending' },
      { id: '2', originalName: 'doc2.pdf', proposedName: 'renamed_doc2.pdf', status: 'pending' },
    ];

    const { result, record } = transaction.executeTransaction(items);

    expect(result.success).toBe(true);
    expect(result.successCount).toBe(2);
    expect(record.status).toBe('completed');
    expect(record.canUndo).toBe(true);
  });

  it('エラー発生時に rollbackOnFailure=true の場合、成功済みアイテムがロールバックされる', () => {
    const items: RenameItem[] = [
      { id: '1', originalName: 'good.mp4', proposedName: 'good_renamed.mp4', status: 'pending' },
      { id: '2', originalName: 'bad.mp4', proposedName: 'bad/invalid.mp4', status: 'pending' }, // 不正文字で失敗
    ];

    const { result, record } = transaction.executeTransaction(items, { rollbackOnFailure: true });

    expect(result.success).toBe(false);
    expect(record.status).toBe('rolled_back');
    expect(result.errors.some((e) => e.includes('ロールバック'))).toBe(true);
  });

  it('rollbackOnFailure=false の場合、部分完了(partially_completed)として記録される', () => {
    const items: RenameItem[] = [
      { id: '1', originalName: 'good.mp4', proposedName: 'good_renamed.mp4', status: 'pending' },
      { id: '2', originalName: 'bad.mp4', proposedName: 'bad/invalid.mp4', status: 'pending' },
    ];

    const { result, record } = transaction.executeTransaction(items, { rollbackOnFailure: false });

    expect(result.success).toBe(false);
    expect(record.status).toBe('partially_completed');
    expect(record.canUndo).toBe(true);
  });
});

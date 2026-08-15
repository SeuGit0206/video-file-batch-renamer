import type { IRenameExecutionService } from './IRenameExecutionService';
import type {
  RenameItem,
  RenameExecutionResult,
  RenameTransactionRecord,
  RenameResultItem,
} from '../../types/rename';

export interface RenameTransactionOptions {
  rollbackOnFailure?: boolean;
}

export class RenameTransaction {
  private executionService: IRenameExecutionService;

  constructor(executionService: IRenameExecutionService) {
    this.executionService = executionService;
  }

  public executeTransaction(
    items: RenameItem[],
    options: RenameTransactionOptions = { rollbackOnFailure: true }
  ): { result: RenameExecutionResult; record: RenameTransactionRecord } {
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    const executedResults: RenameResultItem[] = [];
    const errors: string[] = [];
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;
    let hasFailure = false;

    for (const item of items) {
      if (item.status === 'skipped') {
        skippedCount++;
        executedResults.push({
          id: item.id,
          originalName: item.originalName,
          newName: item.originalName,
          success: false,
          error: 'スキップされました',
          timestamp,
        });
        continue;
      }

      const itemResult = this.executionService.executeItem(item, transactionId);
      executedResults.push(itemResult);

      if (itemResult.success) {
        successCount++;
      } else {
        failureCount++;
        hasFailure = true;
        if (itemResult.error) {
          errors.push(`[${item.originalName}] ${itemResult.error}`);
        }
      }
    }

    let isRolledBack = false;
    let finalStatus: RenameTransactionRecord['status'] = hasFailure
      ? successCount > 0
        ? 'partially_completed'
        : 'failed'
      : 'completed';

    // ロールバック処理（途中失敗時にrollbackOnFailure=trueの場合）
    if (hasFailure && options.rollbackOnFailure && successCount > 0) {
      this.rollbackSuccessfulItems(executedResults);
      isRolledBack = true;
      finalStatus = 'rolled_back';
    }

    const overallSuccess = !hasFailure && !isRolledBack;

    const result: RenameExecutionResult = {
      success: overallSuccess,
      totalCount: items.length,
      successCount: isRolledBack ? 0 : successCount,
      failureCount,
      skippedCount,
      results: executedResults,
      transactionId,
      timestamp,
      errors: isRolledBack
        ? [...errors, 'トランザクション内で失敗が発生したため、成功済みの項目をロールバックしました']
        : errors,
    };

    const record: RenameTransactionRecord = {
      transactionId,
      timestamp,
      items: executedResults,
      status: finalStatus,
      canUndo: overallSuccess || (successCount > 0 && !isRolledBack),
    };

    return { result, record };
  }

  private rollbackSuccessfulItems(results: RenameResultItem[]): void {
    const timestamp = new Date().toISOString();

    for (const res of results) {
      if (res.success) {
        // ロールバック: newName を originalName に戻す
        res.newName = res.originalName;
        res.success = false;
        res.error = 'トランザクション失敗によるロールバック済';
        res.timestamp = timestamp;
      }
    }
  }
}

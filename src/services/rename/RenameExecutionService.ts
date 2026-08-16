import type { IRenameExecutionService } from './IRenameExecutionService';
import type { RenameItem, RenameResultItem, RenameExecutionResult } from '../../types/rename';
import {
  WINDOWS_INVALID_CHARS_REGEX,
  WINDOWS_RESERVED_NAMES_REGEX,
  WINDOWS_INVALID_END_CHARS_REGEX,
} from '../../constants';

export class RenameExecutionService implements IRenameExecutionService {
  private invalidCharsRegex = WINDOWS_INVALID_CHARS_REGEX;
  private reservedNamesRegex = WINDOWS_RESERVED_NAMES_REGEX;
  private invalidEndCharsRegex = WINDOWS_INVALID_END_CHARS_REGEX;

  public validateRename(item: RenameItem): { valid: boolean; error?: string } {
    if (!item.proposedName || item.proposedName.trim() === '') {
      return { valid: false, error: '変更後のファイル名が空です' };
    }

    if (this.invalidCharsRegex.test(item.proposedName)) {
      return { valid: false, error: 'ファイル名に使用できない文字が含まれています (\\ / : * ? " < > |)' };
    }

    if (this.invalidEndCharsRegex.test(item.proposedName)) {
      return { valid: false, error: 'ファイル名の末尾にスペースまたはドットを使用することはできません' };
    }

    if (this.reservedNamesRegex.test(item.proposedName)) {
      return { valid: false, error: 'Windowsの予約デバイス名 (CON, PRN, AUX, NUL, COM1-9, LPT1-9) は使用できません' };
    }

    if (item.originalName === item.proposedName) {
      return { valid: false, error: '変更前と変更後のファイル名が同じです' };
    }

    return { valid: true };
  }

  public executeItem(item: RenameItem): RenameResultItem {
    const timestamp = new Date().toISOString();

    try {
      const validation = this.validateRename(item);
      if (!validation.valid) {
        return {
          id: item.id,
          originalName: item.originalName,
          newName: item.proposedName || item.originalName,
          success: false,
          error: validation.error || '検証エラー',
          timestamp,
        };
      }

      // 成功処理
      return {
        id: item.id,
        originalName: item.originalName,
        newName: item.proposedName,
        success: true,
        timestamp,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        id: item.id,
        originalName: item.originalName,
        newName: item.proposedName || item.originalName,
        success: false,
        error: `リネーム実行エラー: ${errorMessage}`,
        timestamp,
      };
    }
  }

  public executeBatch(items: RenameItem[], transactionId?: string): RenameExecutionResult {
    const timestamp = new Date().toISOString();
    const txId = transactionId || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const results: RenameResultItem[] = [];
    const errors: string[] = [];

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (const item of items) {
      if (item.status === 'skipped') {
        skippedCount++;
        results.push({
          id: item.id,
          originalName: item.originalName,
          newName: item.originalName,
          success: false,
          error: 'スキップされました',
          timestamp,
        });
        continue;
      }

      const res = this.executeItem(item);
      results.push(res);

      if (res.success) {
        successCount++;
      } else {
        failureCount++;
        if (res.error) {
          errors.push(`[${item.originalName}] ${res.error}`);
        }
      }
    }

    const overallSuccess = failureCount === 0;

    return {
      success: overallSuccess,
      totalCount: items.length,
      successCount,
      failureCount,
      skippedCount,
      results,
      transactionId: txId,
      timestamp,
      errors,
    };
  }
}

import type { RenameItem, RenameResultItem, RenameExecutionResult } from '../../types/rename';

export interface IRenameExecutionService {
  executeItem(item: RenameItem, transactionId?: string): RenameResultItem;
  executeBatch(items: RenameItem[], transactionId?: string): RenameExecutionResult;
  validateRename(item: RenameItem): { valid: boolean; error?: string };
}

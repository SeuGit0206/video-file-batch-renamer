/**
 * リネーム実行エンジン関連の型定義 (Phase 65 v1.8.0)
 */

export interface RenameItem {
  id: string;
  originalPath?: string;
  originalName: string;
  proposedName: string;
  status: 'pending' | 'success' | 'failed' | 'skipped' | 'rolled_back';
  errorMessage?: string;
  timestamp?: string;
}

export interface RenameResultItem {
  id: string;
  originalName: string;
  newName: string;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface RenameExecutionResult {
  success: boolean;
  totalCount: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  results: RenameResultItem[];
  transactionId: string;
  timestamp: string;
  errors: string[];
}

export interface RenameTransactionRecord {
  transactionId: string;
  timestamp: string;
  items: RenameResultItem[];
  status: 'completed' | 'failed' | 'partially_completed' | 'rolled_back';
  canUndo: boolean;
}

export interface UndoRedoStackState {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
}

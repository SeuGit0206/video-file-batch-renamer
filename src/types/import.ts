/**
 * インポート機能関連の型定義 (Phase 63 v1.6.0)
 */

export type ImportFormat = 'json' | 'csv' | 'txt' | 'xml';

export type ImportTarget = 'history' | 'metadata' | 'logs' | 'settings' | 'presets';

export type ImportMode = 'overwrite' | 'merge' | 'skip';

export interface ImportRule {
  id: string;
  sourceField: string;
  targetField: string;
  required?: boolean;
  defaultValue?: unknown;
  transform?: 'trim' | 'lowercase' | 'uppercase' | 'none';
}

export interface ImportPreset {
  id: string;
  name: string;
  description?: string;
  format: ImportFormat;
  target: ImportTarget;
  rules: ImportRule[];
  defaultMode: ImportMode;
  createdAt: string;
  updatedAt: string;
}

export interface ImportDiffField {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  status: 'added' | 'modified' | 'removed' | 'unchanged';
}

export interface ImportItemDiff {
  id: string;
  status: 'added' | 'modified' | 'removed' | 'unchanged';
  fields: ImportDiffField[];
}

export interface ImportDiffInfo {
  totalChanges: number;
  addedCount: number;
  modifiedCount: number;
  removedCount: number;
  unchangedCount: number;
  globalFields?: ImportDiffField[];
  itemDiffs?: ImportItemDiff[];
}

export interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recordCount: number;
  diff?: ImportDiffInfo;
  metadata?: Record<string, unknown>;
}

export interface ImportOptions {
  format: ImportFormat;
  target: ImportTarget;
  mode: ImportMode;
  validateOnly?: boolean;
  allowPartialSuccess?: boolean;
  encoding?: string;
  fieldMappings?: Record<string, string>;
  presetId?: string;
}

export interface ImportData {
  title?: string;
  importedAt?: string;
  sourceFormat: ImportFormat;
  target: ImportTarget;
  version?: string;
  items: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
}

export interface ImportResult {
  success: boolean;
  target: ImportTarget;
  format: ImportFormat;
  importedCount: number;
  failedCount: number;
  errors: string[];
  warnings: string[];
  timestamp: string;
  diff?: ImportDiffInfo;
}

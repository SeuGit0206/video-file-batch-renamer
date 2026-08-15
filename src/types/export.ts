/**
 * エクスポート機能関連の型定義
 */

export type ExportFormat = 'csv' | 'json' | 'html';

export type ExportTarget = 'history' | 'metadata' | 'logs' | 'settings' | 'statistics';

export interface ExportOptions {
  format: ExportFormat;
  target: ExportTarget;
  filename?: string;
  includeHeaders?: boolean;
  sanitizeOutput?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface ExportData {
  title?: string;
  exportedAt: string;
  items: unknown[];
  metadata?: Record<string, unknown>;
}

export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  filename: string;
  mimeType: string;
  content?: string;
  blob?: Blob;
  sizeBytes?: number;
  exportedAt: string;
  errorMessage?: string;
}

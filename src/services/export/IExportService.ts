import type { ExportData, ExportFormat, ExportOptions, ExportResult, ExportTarget } from '../../types/export';

/**
 * エクスポートサービスの抽象インターフェース (Strategy Pattern)
 */
export interface IExportService {
  /**
   * エクスポートフォーマット
   */
  readonly format: ExportFormat;

  /**
   * データを指定されたフォーマットでエクスポートする
   * @param data エクスポート対象データ
   * @param options エクスポートオプション
   */
  exportData(data: ExportData, options?: Partial<ExportOptions>): Promise<ExportResult>;

  /**
   * 指定されたターゲットタイプに対応しているかを判定する
   * @param target エクスポート対象タイプ
   */
  supportsTarget(target: ExportTarget): boolean;
}

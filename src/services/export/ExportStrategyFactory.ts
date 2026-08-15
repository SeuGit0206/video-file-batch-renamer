import type { ExportFormat } from '../../types/export';
import { CsvExportService } from './CsvExportService';
import { HtmlExportService } from './HtmlExportService';
import type { IExportService } from './IExportService';
import { JsonExportService } from './JsonExportService';

/**
 * ExportStrategyFactory
 * フォーマットに応じた IExportService の具象クラスを返却する Factory クラス
 */
export class ExportStrategyFactory {
  private static instances: Map<ExportFormat, IExportService> = new Map();

  /**
   * 指定されたフォーマットに対応する IExportService インスタンスを取得する
   * @param format エクスポートフォーマット ('csv' | 'json' | 'html')
   */
  public static getService(format: ExportFormat): IExportService {
    if (this.instances.has(format)) {
      return this.instances.get(format)!;
    }

    let service: IExportService;
    switch (format) {
      case 'csv':
        service = new CsvExportService();
        break;
      case 'json':
        service = new JsonExportService();
        break;
      case 'html':
        service = new HtmlExportService();
        break;
      default:
        throw new Error(`Unsupported export format: ${String(format)}`);
    }

    this.instances.set(format, service);
    return service;
  }
}

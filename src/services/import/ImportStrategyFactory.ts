import type { ImportFormat } from '../../types/import';
import { CsvImportService } from './CsvImportService';
import type { IImportService } from './IImportService';
import { JsonImportService } from './JsonImportService';

/**
 * ImportStrategyFactory
 * フォーマットに応じた IImportService の具象クラスを返却する Strategy Factory クラス
 */
export class ImportStrategyFactory {
  private static instances: Map<ImportFormat, IImportService> = new Map();
  private services: Map<ImportFormat, IImportService>;

  /**
   * DI やカスタマイズに対応するコンストラクタ
   */
  constructor(customServices?: Map<ImportFormat, IImportService>) {
    this.services = customServices || new Map();
    if (!customServices) {
      this.services.set('json', new JsonImportService());
      this.services.set('csv', new CsvImportService());
    }
  }

  /**
   * インスタンス経由で IImportService を取得する
   */
  public getStrategy(format: ImportFormat): IImportService {
    const service = this.services.get(format);
    if (!service) {
      throw new Error(`未対応のインポートフォーマットです: ${String(format)}`);
    }
    return service;
  }

  /**
   * 静的アクセスで IImportService インスタンスを取得する
   * @param format インポートフォーマット ('json' | 'csv' など)
   */
  public static getService(format: ImportFormat): IImportService {
    if (this.instances.has(format)) {
      return this.instances.get(format)!;
    }

    let service: IImportService;
    switch (format) {
      case 'json':
        service = new JsonImportService();
        break;
      case 'csv':
        service = new CsvImportService();
        break;
      default:
        throw new Error(`未対応のインポートフォーマットです: ${String(format)}`);
    }

    this.instances.set(format, service);
    return service;
  }

  /**
   * 新しい Strategy を動的登録する（拡張・カスタマイズ用）
   */
  public static registerStrategy(format: ImportFormat, service: IImportService): void {
    this.instances.set(format, service);
  }

  /**
   * キャッシュされた Strategy をクリアする（テスト用）
   */
  public static clearCache(): void {
    this.instances.clear();
  }
}

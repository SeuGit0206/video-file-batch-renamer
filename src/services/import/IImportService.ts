import type {
  ImportData,
  ImportFormat,
  ImportOptions,
  ImportResult,
  ImportTarget,
  ImportValidationResult,
} from '../../types/import';

/**
 * インポートサービスの抽象インターフェース (Strategy Pattern & DIP)
 */
export interface IImportService {
  /**
   * サポートするインポートフォーマット
   */
  readonly format: ImportFormat;

  /**
   * 原本文字列 (JSON, CSV等) を解析して抽象的な ImportData に変換する
   * @param content ファイルや入力の生データ文字列
   * @param options インポートオプション
   */
  parse(content: string, options?: Partial<ImportOptions>): Promise<ImportData>;

  /**
   * 解析済みデータを検証し、バリデーション結果およびDiff情報を生成する
   * @param data 解析されたインポートデータ
   * @param options インポートオプション
   */
  validate(data: ImportData, options?: Partial<ImportOptions>): Promise<ImportValidationResult>;

  /**
   * インポート処理を実行する
   * @param data 対象インポートデータ
   * @param options インポートオプション
   */
  importData(data: ImportData, options?: Partial<ImportOptions>): Promise<ImportResult>;

  /**
   * 指定されたターゲットタイプに対応しているかを判定する
   * @param target インポート対象タイプ
   */
  supportsTarget(target: ImportTarget): boolean;
}

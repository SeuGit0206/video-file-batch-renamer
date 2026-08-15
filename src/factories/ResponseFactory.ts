import type { ScrapedMetadata } from '../types';

export interface IResponseFactory {
  createSuccessResponse<T = unknown>(data: T): T;
  createMetadataResponse(metadata: ScrapedMetadata): ScrapedMetadata;
  createBadRequestResponse(message: string): { error: string };
}

/**
 * 成功および標準APIレスポンスの生成を担うファクトリクラス
 */
export class ResponseFactory implements IResponseFactory {
  /**
   * 任意のデータの成功レスポンスを返します
   */
  public createSuccessResponse<T = unknown>(data: T): T {
    return data;
  }

  /**
   * ScrapedMetadata レスポンスを返します
   */
  public createMetadataResponse(metadata: ScrapedMetadata): ScrapedMetadata {
    return metadata;
  }

  /**
   * バリデーションエラー等の BadRequest 用レスポンスオブジェクトを返します
   */
  public createBadRequestResponse(message: string): { error: string } {
    return { error: message };
  }
}

import type { Request, Response } from 'express';
import type { ScrapedMetadata } from '../types';
import type { ILogger } from '../services';
import { HTTP_STATUS, LOG_TAGS } from '../constants';
import { LoggingService } from '../services';
import { GetMetadataUseCase, type IGetMetadataUseCase } from '../usecases';
import type { ICacheAdapter } from '../cache';
import {
  ResponseFactory,
  ErrorResponseFactory,
  type IResponseFactory,
  type IErrorResponseFactory
} from '../factories';
import type { IMetricsCollector } from '../metrics/IMetricsCollector';
import { NullMetricsCollector } from '../metrics/NullMetricsCollector';

export type FetchMetadataFn = (productId: string) => Promise<ScrapedMetadata>;

export class MetadataController {
  private getMetadataUseCase: IGetMetadataUseCase;
  private logger: ILogger;
  private responseFactory: IResponseFactory;
  private errorResponseFactory: IErrorResponseFactory;
  private metricsCollector: IMetricsCollector;
  private cacheAdapter?: ICacheAdapter<ScrapedMetadata>;

  constructor(
    getMetadataUseCaseOrFetcher?: IGetMetadataUseCase | FetchMetadataFn,
    logger?: ILogger,
    responseFactory?: IResponseFactory,
    errorResponseFactory?: IErrorResponseFactory,
    metricsCollector?: IMetricsCollector,
    cacheAdapter?: ICacheAdapter<ScrapedMetadata>
  ) {
    if (!getMetadataUseCaseOrFetcher) {
      this.getMetadataUseCase = new GetMetadataUseCase();
    } else if (typeof getMetadataUseCaseOrFetcher === 'function') {
      this.getMetadataUseCase = new GetMetadataUseCase(getMetadataUseCaseOrFetcher);
    } else {
      this.getMetadataUseCase = getMetadataUseCaseOrFetcher;
    }
    this.logger = logger || LoggingService.getInstance();
    this.responseFactory = responseFactory || new ResponseFactory();
    this.errorResponseFactory = errorResponseFactory || new ErrorResponseFactory();
    this.metricsCollector = metricsCollector || new NullMetricsCollector();
    this.cacheAdapter = cacheAdapter;
  }

  /**
   * GET /api/metadata ハンドラー
   */
  public getMetadata = async (req: Request, res: Response): Promise<Response> => {
    const startTime = Date.now();
    const { id } = req.query;
    if (!id || typeof id !== 'string' || !id.trim()) {
      const badRequest = this.responseFactory.createBadRequestResponse('Missing or invalid "id" parameter.');
      this.metricsCollector.recordRequest(Date.now() - startTime, false);
      return res.status(HTTP_STATUS.BAD_REQUEST).json(badRequest);
    }

    const productId = id.trim().toUpperCase();
    this.logger.info(`API Metadata Request for: ${productId}`);

    try {
      const result = await this.getMetadataUseCase.execute(productId);
      const metadataResponse = this.responseFactory.createMetadataResponse(result);
      this.metricsCollector.recordRequest(Date.now() - startTime, true);
      return res.status(HTTP_STATUS.OK).json(metadataResponse);
    } catch (error: unknown) {
      const { statusCode, body } = this.errorResponseFactory.createErrorResponse(error, productId);

      if (statusCode === HTTP_STATUS.NOT_FOUND) {
        this.logger.info(`${LOG_TAGS.SCRAPING} Handled expected 404 for ${productId}: ${body.error}`);
      } else {
        this.logger.warn(`${LOG_TAGS.SCRAPING} Handled request failure for ${productId}: ${body.error}`);
      }

      this.metricsCollector.recordRequest(Date.now() - startTime, false);
      return res.status(HTTP_STATUS.OK).json(body);
    }
  };

  /**
   * DELETE /api/cache ハンドラー
   */
  public clearCache = async (_req: Request, res: Response): Promise<Response> => {
    try {
      if (this.cacheAdapter) {
        await this.cacheAdapter.clear();
      }
      this.logger.info('Server cache cleared successfully.');
      const body = this.responseFactory.createSuccessResponse({
        success: true,
        message: 'Cache cleared successfully'
      });
      return res.status(HTTP_STATUS.OK).json(body);
    } catch (error: unknown) {
      this.logger.error('Failed to clear cache:', error instanceof Error ? error.message : String(error));
      const { statusCode, body } = this.errorResponseFactory.createErrorResponse(error, 'CACHE_CLEAR');
      return res.status(statusCode).json(body);
    }
  };

  /**
   * GET /api/cache/stats ハンドラー
   */
  public getCacheStats = async (_req: Request, res: Response): Promise<Response> => {
    try {
      let stats = { count: 0, maxEntries: 500, defaultTtlMs: 86400000 };
      if (this.cacheAdapter && typeof this.cacheAdapter.getStats === 'function') {
        stats = await this.cacheAdapter.getStats();
      }
      const body = this.responseFactory.createSuccessResponse(stats);
      return res.status(HTTP_STATUS.OK).json(body);
    } catch (error: unknown) {
      this.logger.error('Failed to get cache stats:', error instanceof Error ? error.message : String(error));
      const { statusCode, body } = this.errorResponseFactory.createErrorResponse(error, 'CACHE_STATS');
      return res.status(statusCode).json(body);
    }
  };
}



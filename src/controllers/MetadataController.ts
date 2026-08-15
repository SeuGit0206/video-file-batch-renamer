import type { Request, Response } from 'express';
import type { ScrapedMetadata } from '../types';
import type { ILogger } from '../services';
import { HTTP_STATUS, LOG_TAGS } from '../constants';
import { LoggingService } from '../services';
import { GetMetadataUseCase, type IGetMetadataUseCase } from '../usecases';
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

  constructor(
    getMetadataUseCaseOrFetcher?: IGetMetadataUseCase | FetchMetadataFn,
    logger?: ILogger,
    responseFactory?: IResponseFactory,
    errorResponseFactory?: IErrorResponseFactory,
    metricsCollector?: IMetricsCollector
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
}



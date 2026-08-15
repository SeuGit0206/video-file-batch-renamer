import type { Request, Response } from 'express';
import type { ILogger } from '../services';
import { LoggingService } from '../services';
import type { IResponseFactory, IErrorResponseFactory } from '../factories';
import { ResponseFactory, ErrorResponseFactory } from '../factories';
import type { ICacheAdapter } from '../cache';
import type { IProviderRegistry } from '../providers';
import type { IMetricsCollector } from '../metrics';
import { NullMetricsCollector } from '../metrics';
import { HTTP_STATUS } from '../constants';
import type { ScrapedMetadata } from '../types';

export interface SystemControllerDependencies {
  cacheAdapter?: ICacheAdapter<ScrapedMetadata>;
  providerRegistry?: IProviderRegistry;
  metricsCollector?: IMetricsCollector;
  responseFactory?: IResponseFactory;
  errorResponseFactory?: IErrorResponseFactory;
  logger?: ILogger;
  appVersion?: string;
  appName?: string;
  buildDate?: string;
}

export class SystemController {
  private cacheAdapter?: ICacheAdapter<ScrapedMetadata>;
  private providerRegistry?: IProviderRegistry;
  private metricsCollector: IMetricsCollector;
  private responseFactory: IResponseFactory;
  private errorResponseFactory: IErrorResponseFactory;
  private logger: ILogger;
  private appVersion: string;
  private appName: string;
  private buildDate: string;

  constructor(deps: SystemControllerDependencies = {}) {
    this.cacheAdapter = deps.cacheAdapter;
    this.providerRegistry = deps.providerRegistry;
    this.metricsCollector = deps.metricsCollector || new NullMetricsCollector();
    this.responseFactory = deps.responseFactory || new ResponseFactory();
    this.errorResponseFactory = deps.errorResponseFactory || new ErrorResponseFactory();
    this.logger = deps.logger || LoggingService.getInstance();
    this.appVersion = deps.appVersion || '1.0.0';
    this.appName = deps.appName || 'file-renamer-scraper';
    this.buildDate = deps.buildDate || new Date().toISOString();
  }

  /**
   * GET /api/health
   */
  public getHealth = async (_req: Request, res: Response): Promise<Response> => {
    try {
      let cacheStatus = 'OK';
      if (this.cacheAdapter) {
        try {
          // キャッシュ疎通テスト (存在しないキーで安全に呼び出し)
          await this.cacheAdapter.get('__HEALTH_CHECK__');
        } catch {
          cacheStatus = 'ERROR';
        }
      }

      const providers = this.providerRegistry
        ? this.providerRegistry.getAllProviders().map((p) => p.name)
        : [];

      const status = cacheStatus === 'OK' ? 'UP' : 'DOWN';

      const healthData = {
        status,
        uptime: process.uptime(),
        cache: cacheStatus,
        providers,
        version: this.appVersion,
      };

      const body = this.responseFactory.createSuccessResponse(healthData);
      return res.status(HTTP_STATUS.OK).json(body);
    } catch (error: unknown) {
      this.logger.error('Failed to handle /api/health request:', error instanceof Error ? error.message : String(error));
      const { statusCode, body } = this.errorResponseFactory.createErrorResponse(error, 'HEALTH_CHECK');
      return res.status(statusCode).json(body);
    }
  };

  /**
   * GET /api/metrics
   */
  public getMetrics = (_req: Request, res: Response): Response => {
    try {
      const snapshot = this.metricsCollector.getSnapshot();
      const body = this.responseFactory.createSuccessResponse(snapshot);
      return res.status(HTTP_STATUS.OK).json(body);
    } catch (error: unknown) {
      this.logger.error('Failed to handle /api/metrics request:', error instanceof Error ? error.message : String(error));
      const { statusCode, body } = this.errorResponseFactory.createErrorResponse(error, 'METRICS');
      return res.status(statusCode).json(body);
    }
  };

  /**
   * GET /api/version
   */
  public getVersion = (_req: Request, res: Response): Response => {
    try {
      const versionInfo = {
        version: this.appVersion,
        buildDate: this.buildDate,
        name: this.appName,
      };
      const body = this.responseFactory.createSuccessResponse(versionInfo);
      return res.status(HTTP_STATUS.OK).json(body);
    } catch (error: unknown) {
      this.logger.error('Failed to handle /api/version request:', error instanceof Error ? error.message : String(error));
      const { statusCode, body } = this.errorResponseFactory.createErrorResponse(error, 'VERSION');
      return res.status(statusCode).json(body);
    }
  };

  /**
   * POST /api/test-gemini
   */
  public testGemini = async (req: Request, res: Response): Promise<Response> => {
    try {
      const rawKey =
        typeof req.body?.apiKey === 'string'
          ? req.body.apiKey.trim()
          : '';
      const apiKey = rawKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Gemini APIキーが設定されていません。.env または設定画面でAPIキーを指定してください。',
          troubleshootingUrl: 'docs/TROUBLESHOOTING.md#4-gemini-apiキーエラー--認証失敗',
        });
      }

      this.logger.info('Performing Gemini API connectivity test...');
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Test connection',
      });

      if (response && response.text) {
        this.logger.info('Gemini API connectivity test SUCCESS');
        const body = this.responseFactory.createSuccessResponse({
          message: 'Gemini API 接続成功',
          status: 'ok',
        });
        return res.status(HTTP_STATUS.OK).json(body);
      } else {
        throw new Error('Gemini API returned empty response.');
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Gemini API connectivity test FAILED:', errMsg);
      return res.status(HTTP_STATUS.OK).json({
        success: false,
        error: 'Gemini API 接続失敗: APIキーが無効か制限されています。',
        details: errMsg,
        troubleshootingUrl: 'docs/TROUBLESHOOTING.md#4-gemini-apiキーエラー--認証失敗',
      });
    }
  };
}

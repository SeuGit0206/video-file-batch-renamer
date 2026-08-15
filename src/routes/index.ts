import { Router } from 'express';
import type { ScrapedMetadata } from '../types';
import type { MetadataController, SystemController } from '../controllers';
import type { ValidationMiddleware } from '../validation';
import { createMetadataRouter } from './metadataRoutes';
import { createSystemRouter } from './systemRoutes';

export interface ApiRouterDependencies {
  fetchAndParseMissAV?: (productId: string) => Promise<ScrapedMetadata>;
  controller?: MetadataController;
  systemController?: SystemController;
  validationMiddleware?: ValidationMiddleware;
}

/**
 * /api 配下の統合 Express Router を作成
 */
export function createApiRouter(deps?: ApiRouterDependencies): Router {
  const apiRouter = Router();

  const metadataTarget = deps?.controller || deps?.fetchAndParseMissAV;
  apiRouter.use('/', createMetadataRouter(metadataTarget, deps?.validationMiddleware));
  apiRouter.use('/', createSystemRouter(deps?.systemController));

  return apiRouter;
}

export * from './metadataRoutes';
export * from './systemRoutes';


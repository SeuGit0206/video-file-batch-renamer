import { Router } from 'express';
import type { ScrapedMetadata } from '../types';
import { MetadataController } from '../controllers';
import { ValidationMiddleware } from '../validation';

/**
 * メタデータ取得 API (/api/metadata) の Express Router を作成
 */
export function createMetadataRouter(
  fetchAndParseMissAVOrController?: ((productId: string) => Promise<ScrapedMetadata>) | MetadataController,
  validationMiddleware?: ValidationMiddleware
): Router {
  const router = Router();
  let controller: MetadataController;
  if (fetchAndParseMissAVOrController instanceof MetadataController) {
    controller = fetchAndParseMissAVOrController;
  } else if (
    fetchAndParseMissAVOrController !== null &&
    typeof fetchAndParseMissAVOrController === 'object'
  ) {
    const candidate = fetchAndParseMissAVOrController as unknown as Record<string, unknown>;
    if (typeof candidate.getMetadata === 'function') {
      controller = fetchAndParseMissAVOrController as unknown as MetadataController;
    } else {
      controller = new MetadataController();
    }
  } else {
    controller = new MetadataController(
      typeof fetchAndParseMissAVOrController === 'function'
        ? fetchAndParseMissAVOrController
        : undefined
    );
  }




  const validator =
    validationMiddleware instanceof ValidationMiddleware ||
    (validationMiddleware &&
      typeof (validationMiddleware as ValidationMiddleware).sanitizeInput === 'function')
      ? validationMiddleware
      : new ValidationMiddleware();


  router.get('/metadata', validator.sanitizeInput(), (req, res) => controller.getMetadata(req, res));

  return router;
}


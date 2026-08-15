import { Router } from 'express';
import { SystemController } from '../controllers';

/**
 * システム情報・監視 API (/api/health, /api/metrics, /api/version, /api/test-gemini) の Express Router を作成
 */
export function createSystemRouter(systemController?: SystemController): Router {
  const router = Router();
  let controller: SystemController;
  if (systemController instanceof SystemController) {
    controller = systemController;
  } else if (
    systemController !== null &&
    typeof systemController === 'object'
  ) {
    const candidate = systemController as unknown as Record<string, unknown>;
    if (typeof candidate.getHealth === 'function') {
      controller = systemController as unknown as SystemController;
    } else {
      controller = new SystemController();
    }
  } else {
    controller = new SystemController();
  }





  router.get('/health', (req, res) => controller.getHealth(req, res));
  router.get('/metrics', (req, res) => controller.getMetrics(req, res));
  router.get('/version', (req, res) => controller.getVersion(req, res));
  router.post('/test-gemini', (req, res) => controller.testGemini(req, res));

  return router;
}


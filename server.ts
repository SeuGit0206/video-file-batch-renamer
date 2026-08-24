import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { PlaywrightBrowserService } from './src/browser/PlaywrightBrowserService';
import { getErrorMessage, isScraperCustomError } from './src/types';
import { ErrorLogService } from './src/services';
import { createApiRouter } from './src/routes';
import { CompressionMiddleware } from './src/middleware';
import { CompositionRoot } from './src/composition';
import {
  DEFAULT_PORT,
  PLAYWRIGHT_CACHE_DIR_NAME,
  LOG_TAGS,
} from './src/constants';

dotenv.config();

// CompositionRoot から依存オブジェクトを取得
const compositionRoot = CompositionRoot.getInstance();
const logger = compositionRoot.getLoggingService();
const getMetadataUseCase = compositionRoot.getGetMetadataUseCase();
const metadataController = compositionRoot.getMetadataController();
const systemController = compositionRoot.getSystemController();
const securityMiddleware = compositionRoot.getSecurityMiddleware();
const validationMiddleware = compositionRoot.getValidationMiddleware();
const responseCacheMiddleware = compositionRoot.getResponseCacheMiddleware();
const monitoringMiddleware = compositionRoot.getMonitoringMiddleware();
const prometheusExporter = compositionRoot.getPrometheusExporter();

// Ensure Playwright uses our local workspace directory for browser binaries
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(process.cwd(), PLAYWRIGHT_CACHE_DIR_NAME);

// Start-up browser existence test
async function checkPlaywrightBrowser(): Promise<boolean> {
  logger.info(`${LOG_TAGS.PLAYWRIGHT_CHECK} Verifying Chromium browser availability...`);
  try {
    const service = new PlaywrightBrowserService();
    await service.initialize({ headless: true });
    await service.dispose();
    logger.info("=== [SUCCESS] Playwright Chromium browser is verified and available. ===");
    return true;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("==================================================================");
    logger.error("=== [ERROR] Playwright browser (Chromium) is not installed! ===");
    logger.error("=== Please run: npx playwright install chromium                ===");
    logger.error(`=== Error Details: ${err.message}`);
    logger.error("==================================================================");
    ErrorLogService.saveErrorLog(err);
    return false;
  }
}

const app = express();
const PORT = DEFAULT_PORT;

// Apply Performance, Security, Validation & Monitoring Middlewares
app.use(monitoringMiddleware.handle());
app.use(CompressionMiddleware.create());
app.use(securityMiddleware.applySecurityHeaders());
app.use(securityMiddleware.enforcePayloadLimit());
app.use(express.json());
app.use(validationMiddleware.sanitizeInput());
app.use(responseCacheMiddleware.handle());

// Metrics & Tracing Exporter Endpoints
app.get('/metrics', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(prometheusExporter.exportMetrics());
});

app.get('/otel/spans', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(prometheusExporter.exportOpenTelemetryJson());
});

// Mount API Routes with injected Composition Root Controller
app.use('/api', createApiRouter({ controller: metadataController, systemController }));

// Configure Vite middleware or Static files depending on Environment
async function setupServer() {
  // Check if we are running in CLI test mode
  const testArgIndex = process.argv.indexOf('--test');
  if (testArgIndex !== -1) {
    const testId = process.argv[testArgIndex + 1] || 'FC2-PPV-102934';
    logger.info(`=== RUNNING CLI TEST FOR ID: ${testId} ===`);
    try {
      const result = await getMetadataUseCase.execute(testId);
      logger.info("=== TEST RESULT SUCCESS ===");
      logger.info(JSON.stringify(result, null, 2));
      process.exit(0);
    } catch (err: unknown) {
      const errMessage = getErrorMessage(err);
      const debugInfo = isScraperCustomError(err) ? err.debug : undefined;
      logger.error("=== TEST RESULT FAILED ===");
      logger.error(errMessage);
      if (debugInfo) {
        logger.error(JSON.stringify(debugInfo, null, 2));
      }
      process.exit(1);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server is running at http://0.0.0.0:${PORT}`);
    // Non-blocking browser availability check in background
    checkPlaywrightBrowser().catch((err) => {
      logger.warn(`Browser availability check warning: ${err instanceof Error ? err.message : String(err)}`);
    });
  });
}

void setupServer();

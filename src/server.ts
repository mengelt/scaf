import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import { existsSync } from 'fs';
import helmet from 'helmet';
import { dirname, resolve } from 'path';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import config from './config';
import { closeRedis, initializeRedis } from './core/cache/redis';
import { closeDatabase, initializeDatabase } from './core/database/connection';
import logger from './core/logger';
import { errorHandler, notFoundHandler } from './core/middleware/error.middleware';
import { apiRateLimiter } from './core/middleware/rate-limit.middleware';
import { requestIdMiddleware } from './core/middleware/request-id.middleware';

// Import generated routes (created by tsoa)
import { RegisterRoutes } from './generated/routes.js';

const app: Application = express();

/**
 * Initialize middleware
 */
function initializeMiddleware(app: Application): void {
  logger.info('→ Registering middleware...');

  // Security middleware - configure CSP to allow Swagger UI
  logger.info('  ✓ Helmet security headers');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'", 'https:', 'data:'],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
          upgradeInsecureRequests: [],
        },
      },
    })
  );

  // CORS middleware
  logger.info('  ✓ CORS configuration');
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: true,
    })
  );

  // Request ID middleware - must be early to ensure all logs have request ID
  logger.info('  ✓ Request ID tracking');
  app.use(requestIdMiddleware);

  // Body parsing middleware
  logger.info('  ✓ Body parser (JSON/URL-encoded)');
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Rate limiting
  logger.info('  ✓ Rate limiting');
  app.use('/api', apiRateLimiter);

  // Request logging
  logger.info('  ✓ Request logging');
  app.use((req: Request, res: Response, next) => {
    logger.info(`${req.method} ${req.path}`, { requestId: req.id });
    next();
  });

  logger.info('→ Middleware registration complete\n');
}

/**
 * Initialize routes
 */
async function initializeRoutes(app: Application): Promise<void> {
  logger.info('→ Registering routes...');

  // Root endpoint
  logger.info('  ✓ Root endpoint (/)');
  app.get('/', (req: Request, res: Response) => {
    res.json({
      message: 'Cairo Backend API',
      version: '2.0.0',
      status: 'running',
    });
  });

  // Swagger documentation (optional - only if generated)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const swaggerPath = resolve(__dirname, '../public/swagger.json');

  if (existsSync(swaggerPath)) {
    try {
      const swaggerDocument = await import('../public/swagger.json', {
        assert: { type: 'json' },
      });

      // First middleware must be serve to handle static assets
      app.use('/api-docs', swaggerUi.serve);
      // Then setup for the main page
      app.get('/api-docs', swaggerUi.setup(swaggerDocument.default));

      logger.info('  ✓ Swagger UI (/api-docs)');
    } catch (error) {
      logger.warn('  ⚠ Swagger UI failed to load');
    }
  } else {
    logger.warn('  ⚠ Swagger UI not available (run npm run tsoa:generate)');
  }

  // Register TSOA generated routes
  logger.info('  ✓ TSOA generated routes');
  RegisterRoutes(app);

  // Manual route registration (temporary until tsoa is set up)
  // Health routes are registered manually since they don't require auth
  logger.info('  ✓ Health check routes (/actuator/*)');
  const healthRouter = express.Router();
  const { HealthController } = await import('./features/health/health.controller.js');
  const healthController = new HealthController();

  healthRouter.get('/health', async (req, res, next) => {
    try {
      const result = await healthController.getHealth();
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  healthRouter.get('/health/liveness', async (req, res, next) => {
    try {
      const result = await healthController.getLiveness();
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  healthRouter.get('/health/readiness', async (req, res, next) => {
    try {
      const result = await healthController.getReadiness();
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  healthRouter.get('/info', async (req, res, next) => {
    try {
      const result = await healthController.getInfo();
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.use('/actuator', healthRouter);

  // 404 handler for undefined routes
  logger.info('  ✓ 404 handler');
  app.use(notFoundHandler);

  // Global error handler (must be last)
  logger.info('  ✓ Error handler');
  app.use(errorHandler);

  logger.info('→ Route registration complete\n');
}

/**
 * Initialize database and cache connections
 */
async function initializeConnections(): Promise<void> {
  try {
    logger.info('→ Initializing connections...');

    // Initialize database
    logger.info('  ✓ Oracle database connection');
    await initializeDatabase();

    // Initialize Redis (only if enabled)
    if (config.redis.enabled) {
      logger.info('  ✓ Redis cache connection');
      initializeRedis();
    } else {
      logger.info('  ⚠ Redis disabled (local dev mode)');
    }

    logger.info('→ Connection initialization complete\n');
  } catch (error) {
    logger.error('Failed to initialize connections:', error);
    throw error;
  }
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Initialize connections
    await initializeConnections();

    // Initialize middleware
    initializeMiddleware(app);

    // Initialize routes
    await initializeRoutes(app);

    // Start listening
    const server = app.listen(config.port, () => {
      // ASCII Box Banner
      const appName = 'CAIRO BACKEND API';
      const port = `PORT: ${config.port}`;
      const env = `ENVIRONMENT: ${config.nodeEnv.toUpperCase()}`;
      const healthUrl = `http://localhost:${config.port}/actuator/health`;
      const docsUrl = `http://localhost:${config.port}/api-docs`;

      // Calculate box width based on longest line
      const maxWidth = Math.max(
        appName.length,
        port.length,
        env.length,
        healthUrl.length,
        docsUrl.length
      ) + 4;

      const horizontalBorder = '═'.repeat(maxWidth);
      const padLeft = (text: string) => {
        const rightPadding = maxWidth - text.length - 2;
        return `║ ${text}${' '.repeat(rightPadding)} ║`;
      };

      console.log('\n');
      console.log(`╔${horizontalBorder}╗`);
      console.log(padLeft(appName));
      console.log(`╠${horizontalBorder}╣`);
      console.log(padLeft(port));
      console.log(padLeft(env));
      console.log(`╠${horizontalBorder}╣`);
      console.log(padLeft('Health Check:'));
      console.log(padLeft(healthUrl));
      console.log(padLeft('API Documentation:'));
      console.log(padLeft(docsUrl));
      console.log(`╚${horizontalBorder}╝`);
      console.log('\n');
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Received shutdown signal, closing gracefully...');

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await closeDatabase();
          if (config.redis.enabled) {
            await closeRedis();
          }
          logger.info('All connections closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
const isMainModule = import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`;
if (isMainModule) {
  startServer();
}

export { app, startServer };

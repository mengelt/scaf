import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import config from './config';
import logger from './core/logger';
import { initializeDatabase, closeDatabase } from './core/database/connection';
import { initializeRedis, closeRedis } from './core/cache/redis';
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
  // Security middleware - relax CSP for Swagger UI
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
        },
      },
    })
  );

  // CORS middleware
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: true,
    })
  );

  // Request ID middleware - must be early to ensure all logs have request ID
  app.use(requestIdMiddleware);

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Rate limiting
  app.use('/api', apiRateLimiter);

  // Request logging
  app.use((req: Request, res: Response, next) => {
    logger.info(`${req.method} ${req.path}`, { requestId: req.id });
    next();
  });
}

/**
 * Initialize routes
 */
async function initializeRoutes(app: Application): Promise<void> {
  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      message: 'Cairo Backend API',
      version: '1.0.0',
      status: 'running',
    });
  });

  // Swagger documentation
  const swaggerDocument = await import('../public/swagger.json', { assert: { type: 'json' } });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument.default));

  // Register TSOA generated routes
  RegisterRoutes(app);

  // Manual route registration (temporary until tsoa is set up)
  // Health routes are registered manually since they don't require auth
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
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);
}

/**
 * Initialize database and cache connections
 */
async function initializeConnections(): Promise<void> {
  try {
    logger.info('Initializing connections...');

    // Initialize database
    await initializeDatabase();

    // Initialize Redis (only if enabled)
    if (config.redis.enabled) {
      initializeRedis();
    } else {
      logger.info('Redis disabled - running without cache (local dev mode)');
    }

    logger.info('All connections initialized successfully');
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
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Health check: http://localhost:${config.port}/actuator/health`);
      logger.info(`API docs: http://localhost:${config.port}/api-docs (run 'npm run tsoa:generate' to enable)`);
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

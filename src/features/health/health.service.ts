import { checkDatabaseHealth } from '../../core/database/connection';
import { checkRedisHealth } from '../../core/cache/redis';
import config from '../../config';
import logger from '../../core/logger';

export class HealthService {
  /**
   * Get basic health status
   */
  async getBasicHealth() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
    };
  }

  /**
   * Get detailed health with component checks
   */
  async getDetailedHealth() {
    try {
      const [dbHealth, redisHealth] = await Promise.all([
        checkDatabaseHealth(),
        checkRedisHealth(),
      ]);

      // Only consider Redis in overall health if it's enabled
      const isHealthy = config.redis.enabled
        ? dbHealth.connected && redisHealth.connected
        : dbHealth.connected;

      return {
        status: isHealthy ? 'UP' : 'DOWN',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
        checks: {
          database: {
            status: dbHealth.connected ? 'UP' : 'DOWN',
            message: dbHealth.message,
          },
          redis: {
            status: redisHealth.connected ? 'UP' : 'DOWN',
            message: redisHealth.message,
          },
        },
      };
    } catch (error) {
      logger.error('Error checking detailed health:', error);
      return {
        status: 'DOWN',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
        checks: {
          database: {
            status: 'UNKNOWN',
            message: 'Failed to check database health',
          },
          redis: {
            status: 'UNKNOWN',
            message: 'Failed to check Redis health',
          },
        },
      };
    }
  }

  /**
   * Get readiness health - similar to detailed but may have different logic
   */
  async getReadinessHealth() {
    // For readiness, we want to ensure all critical components are ready
    return this.getDetailedHealth();
  }

  /**
   * Get application info
   */
  async getInfo() {
    return {
      app: {
        name: 'cairo-backend',
        version: '1.0.0',
        environment: config.nodeEnv,
      },
      build: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}

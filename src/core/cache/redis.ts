import Redis from 'ioredis';
import config from '../../config';
import logger from '../logger';

let redisClient: Redis | null = null;
let redisAvailable = true;
let errorLogged = false;

/**
 * Initialize Redis client
 */
export function initializeRedis(): Redis {
  if (!config.redis.enabled) {
    logger.info('Redis is disabled, skipping initialization');
    redisAvailable = false;
    return null as any;
  }

  try {
    logger.info('Initializing Redis client...');

    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      lazyConnect: true,
      retryStrategy: (times: number) => {
        // Stop retrying after 3 attempts
        if (times > 3) {
          redisAvailable = false;
          if (!errorLogged) {
            logger.warn('Redis unavailable - continuing without cache (local dev mode)');
            errorLogged = true;
          }
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
      redisAvailable = true;
      errorLogged = false;
    });

    redisClient.on('error', (error) => {
      if (!errorLogged) {
        logger.warn(`Redis connection error: ${error.message} - continuing without cache`);
        errorLogged = true;
      }
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
      redisAvailable = true;
    });

    // Attempt to connect
    redisClient.connect().catch(() => {
      redisAvailable = false;
      if (!errorLogged) {
        logger.warn('Redis unavailable - continuing without cache (local dev mode)');
        errorLogged = true;
      }
    });

    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis client:', error);
    throw error;
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    return initializeRedis();
  }
  return redisClient;
}

/**
 * Set a value in Redis with optional TTL
 */
export async function setCache(key: string, value: any, ttl?: number): Promise<void> {
  if (!redisAvailable) {
    logger.debug(`Cache unavailable, skipping set: ${key}`);
    return;
  }

  try {
    const client = getRedisClient();
    const serializedValue = JSON.stringify(value);

    if (ttl) {
      await client.setex(key, ttl, serializedValue);
    } else {
      await client.set(key, serializedValue);
    }

    logger.debug(`Cache set: ${key}`);
  } catch (error) {
    logger.debug(`Failed to set cache for key ${key}, continuing without cache`);
  }
}

/**
 * Get a value from Redis
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!redisAvailable) {
    logger.debug(`Cache unavailable, returning null: ${key}`);
    return null;
  }

  try {
    const client = getRedisClient();
    const value = await client.get(key);

    if (!value) {
      logger.debug(`Cache miss: ${key}`);
      return null;
    }

    logger.debug(`Cache hit: ${key}`);
    return JSON.parse(value) as T;
  } catch (error) {
    logger.debug(`Failed to get cache for key ${key}, continuing without cache`);
    return null;
  }
}

/**
 * Delete a value from Redis
 */
export async function deleteCache(key: string): Promise<void> {
  if (!redisAvailable) {
    logger.debug(`Cache unavailable, skipping delete: ${key}`);
    return;
  }

  try {
    const client = getRedisClient();
    await client.del(key);
    logger.debug(`Cache deleted: ${key}`);
  } catch (error) {
    logger.debug(`Failed to delete cache for key ${key}, continuing without cache`);
  }
}

/**
 * Check if a key exists in Redis
 */
export async function hasCache(key: string): Promise<boolean> {
  if (!redisAvailable) {
    logger.debug(`Cache unavailable, returning false: ${key}`);
    return false;
  }

  try {
    const client = getRedisClient();
    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    logger.debug(`Failed to check cache existence for key ${key}, continuing without cache`);
    return false;
  }
}

/**
 * Check Redis connectivity
 */
export async function checkRedisHealth(): Promise<{ connected: boolean; message?: string }> {
  if (!config.redis.enabled) {
    return {
      connected: false,
      message: 'Redis is disabled (local dev mode)',
    };
  }

  if (!redisAvailable) {
    return {
      connected: false,
      message: 'Redis unavailable',
    };
  }

  try {
    const client = getRedisClient();
    if (!client) {
      return {
        connected: false,
        message: 'Redis client not initialized',
      };
    }
    await client.ping();
    return {
      connected: true,
      message: 'Redis connection is healthy',
    };
  } catch (error) {
    logger.debug('Redis health check failed:', error);
    return {
      connected: false,
      message: `Redis connection failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis client closed');
    }
  } catch (error) {
    logger.error('Failed to close Redis client:', error);
    throw error;
  }
}

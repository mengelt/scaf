import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

interface Config {
  port: number;
  nodeEnv: string;
  db: {
    user: string;
    password: string;
    connectionString: string;
    poolMin: number;
    poolMax: number;
    poolIncrement: number;
  };
  redis: {
    enabled: boolean;
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  cors: {
    origin: string | string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  logging: {
    level: string;
  };
  api: {
    keyHeaderName: string;
    keyCacheTTL: number;
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    connectionString: process.env.DB_CONNECTION_STRING || '',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
    poolIncrement: parseInt(process.env.DB_POOL_INCREMENT || '1', 10),
  },
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true' || process.env.NODE_ENV === 'production',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  api: {
    keyHeaderName: process.env.API_KEY_HEADER_NAME || 'x-api-key',
    keyCacheTTL: parseInt(process.env.API_KEY_CACHE_TTL || '3600', 10),
  },
};

export default config;

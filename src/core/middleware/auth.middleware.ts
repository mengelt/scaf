import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';
import { getCache, setCache } from '../cache/redis';
import config from '../../config';
import logger from '../logger';

/**
 * Middleware to validate SSO authentication
 * Expects identityId header from upstream SSO
 */
export async function validateSSOAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const identityId = req.headers['identityid'] as string;

    if (!identityId) {
      res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized: Missing identity ID',
        timestamp: new Date().toISOString(),
        path: req.path,
      });
      return;
    }

    // Attach identityId to request
    req.identityId = identityId;
    req.isApiKeyAuth = false;

    logger.debug(`SSO authentication successful for identity: ${identityId}`);
    next();
  } catch (error) {
    logger.error('SSO authentication error:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Internal server error during authentication',
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  }
}

/**
 * Middleware to validate API key authentication
 * Checks API key from header, validates against Oracle DB (with Redis caching)
 */
export async function validateApiKeyAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers[config.api.keyHeaderName] as string;

    if (!apiKey) {
      res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized: Missing API key',
        timestamp: new Date().toISOString(),
        path: req.path,
      });
      return;
    }

    // Check Redis cache first
    const cacheKey = `api_key:${apiKey}`;
    const cachedApiKeyData = await getCache<{ id: string; isValid: boolean }>(cacheKey);

    if (cachedApiKeyData) {
      if (!cachedApiKeyData.isValid) {
        res.status(401).json({
          statusCode: 401,
          message: 'Unauthorized: Invalid API key',
          timestamp: new Date().toISOString(),
          path: req.path,
        });
        return;
      }

      // API key is valid (from cache)
      req.apiKeyId = cachedApiKeyData.id;
      req.isApiKeyAuth = true;
      logger.debug(`API key authentication successful (cached): ${cachedApiKeyData.id}`);
      next();
      return;
    }

    // Cache miss - validate against database
    // TODO: Implement actual database validation
    const isValid = await validateApiKeyInDatabase(apiKey);

    if (!isValid) {
      // Cache invalid API key to prevent repeated DB lookups
      await setCache(cacheKey, { isValid: false }, config.api.keyCacheTTL);

      res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized: Invalid API key',
        timestamp: new Date().toISOString(),
        path: req.path,
      });
      return;
    }

    // API key is valid - cache it
    const apiKeyId = 'stub-api-key-id'; // TODO: Get actual ID from database
    await setCache(cacheKey, { id: apiKeyId, isValid: true }, config.api.keyCacheTTL);

    req.apiKeyId = apiKeyId;
    req.isApiKeyAuth = true;

    logger.debug(`API key authentication successful (DB): ${apiKeyId}`);
    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Internal server error during authentication',
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  }
}

/**
 * Validate API key against Oracle database
 * TODO: Implement actual Oracle DB query
 */
async function validateApiKeyInDatabase(apiKey: string): Promise<boolean> {
  try {
    logger.debug(`Validating API key in database (STUB): ${apiKey}`);

    // TODO: Implement actual database query
    // const connection = await getConnection();
    // const result = await connection.execute(
    //   `SELECT id, is_active, expires_at FROM api_keys WHERE key_hash = :keyHash AND is_active = 1`,
    //   [hashApiKey(apiKey)]
    // );

    // if (result.rows.length === 0) {
    //   return false;
    // }

    // const apiKeyData = result.rows[0];
    // const expiresAt = apiKeyData.expires_at;

    // if (expiresAt && new Date(expiresAt) < new Date()) {
    //   return false;
    // }

    // return true;

    // Stub: For development, accept any non-empty API key
    return apiKey.length > 0;
  } catch (error) {
    logger.error('Database validation error:', error);
    return false;
  }
}

/**
 * Optional: Middleware that accepts either SSO or API key authentication
 */
export async function validateAnyAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const identityId = req.headers['identityid'] as string;
  const apiKey = req.headers[config.api.keyHeaderName] as string;

  if (identityId) {
    return validateSSOAuth(req, res, next);
  } else if (apiKey) {
    return validateApiKeyAuth(req, res, next);
  } else {
    res.status(401).json({
      statusCode: 401,
      message: 'Unauthorized: Missing authentication credentials',
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  }
}

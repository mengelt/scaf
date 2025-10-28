import rateLimit from 'express-rate-limit';
import config from '../../config';
import logger from '../logger';

/**
 * Rate limiter for API endpoints
 * Limits requests by IP address
 */
export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    statusCode: 429,
    message: 'Too many requests from this IP, please try again later',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      statusCode: 429,
      message: 'Too many requests from this IP, please try again later',
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  },
  skip: (req) => {
    // Skip rate limiting for health check endpoints
    return req.path.startsWith('/actuator');
  },
});

/**
 * Stricter rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    statusCode: 429,
    message: 'Too many authentication attempts, please try again later',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      statusCode: 429,
      message: 'Too many authentication attempts, please try again later',
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  },
});

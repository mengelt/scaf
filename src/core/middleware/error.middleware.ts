import { Request, Response, NextFunction } from 'express';
import logger from '../logger';
import { ApiErrorResponse } from '../../types';

/**
 * Custom error class for HTTP errors
 */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: any[]
  ) {
    super(message);
    this.name = 'HttpError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Custom error class for validation errors
 */
export class ValidationError extends HttpError {
  constructor(message: string, errors?: any[]) {
    super(400, message, errors);
    this.name = 'ValidationError';
  }
}

/**
 * Custom error class for not found errors
 */
export class NotFoundError extends HttpError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

/**
 * Custom error class for unauthorized errors
 */
export class UnauthorizedError extends HttpError {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Custom error class for forbidden errors
 */
export class ForbiddenError extends HttpError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Global error handler middleware
 * Catches all errors and returns consistent RESTful error responses
 */
export function errorHandler(
  err: Error | HttpError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Default error values
  let statusCode = 500;
  let message = 'Internal server error';
  let errors: any[] | undefined;

  // Handle known error types
  if (err instanceof HttpError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err.name === 'ValidationError') {
    // Joi validation error
    statusCode = 400;
    message = 'Validation error';
    errors = (err as any).details?.map((detail: any) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = err.message || 'Unauthorized';
  } else if (err.name === 'SyntaxError' && 'body' in err) {
    // JSON parsing error
    statusCode = 400;
    message = 'Invalid JSON in request body';
  }

  // Log error
  if (statusCode >= 500) {
    logger.error('Server error:', {
      requestId: req.id,
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.warn('Client error:', {
      requestId: req.id,
      error: err.message,
      path: req.path,
      method: req.method,
      statusCode,
    });
  }

  // Build error response
  const errorResponse: ApiErrorResponse = {
    statusCode,
    message,
    timestamp: new Date().toISOString(),
    path: req.path,
    requestId: req.id,
  };

  if (errors) {
    errorResponse.errors = errors;
  }

  // Don't expose stack traces in production
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    (errorResponse as any).stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const errorResponse: ApiErrorResponse = {
    statusCode: 404,
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
    path: req.path,
    requestId: req.id,
  };

  logger.warn(`404 - Route not found: ${req.method} ${req.path}`, { requestId: req.id });
  res.status(404).json(errorResponse);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

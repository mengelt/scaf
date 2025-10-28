import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Middleware to generate or accept request ID for correlation tracking
 *
 * Checks for x-request-id header from upstream systems (like API gateway)
 * Otherwise generates a new UUID
 *
 * The request ID is added to:
 * - req.id for use in handlers
 * - x-request-id response header for client tracking
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check if request ID was provided by upstream (API gateway, load balancer, etc.)
  const incomingRequestId = req.headers['x-request-id'] as string;

  // Use provided ID or generate new one
  req.id = incomingRequestId || randomUUID();

  // Always return the request ID in response headers for client tracking
  res.setHeader('x-request-id', req.id);

  next();
}

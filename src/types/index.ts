import { Request } from 'express';

// Augment Express Request globally to add request ID
declare global {
  namespace Express {
    interface Request {
      id: string; // Request ID for correlation tracking
    }
  }
}

// Augment Express Request with custom properties
export interface AuthenticatedRequest extends Request {
  identityId?: string;
  apiKeyId?: string;
  isApiKeyAuth?: boolean;
}

// Base model interface
export interface BaseModel {
  id: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Pagination parameters
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

// Pagination result
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Filter operators
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in';

// Generic filter interface
export interface Filter {
  field: string;
  operator: FilterOperator;
  value: any;
}

// API Error response
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  errors?: any[];
  timestamp: string;
  path?: string;
  requestId?: string;
}

// API Success response
export interface ApiSuccessResponse<T = any> {
  statusCode: number;
  data: T;
  message?: string;
}

// Database connection result
export interface DbConnectionResult {
  connected: boolean;
  message?: string;
}

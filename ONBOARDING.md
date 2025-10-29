# Developer Onboarding Guide

Welcome to the Cairo Backend project! This guide will help you understand the architecture, patterns, and workflows for developing in this application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Architecture](#project-architecture)
3. [Creating Your First Endpoint](#creating-your-first-endpoint)
4. [Database Layer](#database-layer)
5. [Validation](#validation)
6. [Authentication & Authorization](#authentication--authorization)
7. [Error Handling](#error-handling)
8. [Testing](#testing)
9. [Debugging](#debugging)
10. [API Documentation with TSOA](#api-documentation-with-tsoa)
11. [Code Formatting](#code-formatting)
12. [Best Practices](#best-practices)
13. [Common Patterns](#common-patterns)

---

## Getting Started

### Prerequisites

- Node.js 18+ (check with `node --version`)
- npm 9+ (check with `npm --version`)
- Oracle database access (connection details from team lead)
- Redis (optional for local dev, required for production)

### Initial Setup

```bash
# 1. Clone the repository
git clone git@github.com:mengelt/scaf.git
cd scaf

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your local database credentials

# 4. Build the project
npm run build

# 5. Start the development server
npm run dev
```

### Verify Installation

```bash
# The server should start on http://localhost:3000
curl http://localhost:3000/actuator/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-10-28T...",
  "services": {
    "database": "connected",
    "redis": "disabled (local dev mode)"
  }
}
```

### Development Workflow

**Using VS Code (Recommended):**
- Press `F5` to launch the server with debugging enabled
- Select "Launch Server (Watch Mode)" for automatic rebuilds
- Set breakpoints directly in TypeScript files
- View logs in the integrated terminal

**Using Command Line:**
```bash
npm run dev     # Watch mode with hot reload
npm run build   # Production build
npm test        # Run all tests
npm run test:ui # Run tests with UI
```

---

## Project Architecture

### Feature-Based Structure

We use a **feature-based** (not layer-based) architecture. Each feature is self-contained with all its files in one directory.

```
src/
├── features/
│   └── users/                    # Example feature
│       ├── user.model.ts         # TypeScript interfaces/types
│       ├── user.repository.ts    # Database operations
│       ├── user.service.ts       # Business logic
│       ├── user.controller.ts    # HTTP handlers (annotated for TSOA)
│       ├── user.validation.ts    # Joi schemas
│       ├── user.service.test.ts  # Unit tests
│       └── user.validation.test.ts
├── core/                         # Shared infrastructure
│   ├── database/                 # Database connection & base repo
│   ├── cache/                    # Redis client
│   ├── logger/                   # Winston logger
│   └── middleware/               # Express middleware
├── config/                       # Configuration management
├── types/                        # Global TypeScript types
└── server.ts                     # Application entry point
```

### Separation of Concerns

Each file has a specific responsibility:

- **Model**: Define data structures and types
- **Repository**: Database operations (CRUD)
- **Service**: Business logic, orchestration, caching
- **Controller**: HTTP request/response handling, validation
- **Validation**: Joi schemas for input validation

---

## Creating Your First Endpoint

Let's create a complete feature for managing "Products". We'll build this step-by-step.

### Step 1: Create the Feature Directory

```bash
mkdir -p src/features/products
```

### Step 2: Define the Model

**File: `src/features/products/product.model.ts`**

```typescript
import { BaseModel } from '../../types';

export interface Product extends BaseModel {
  id: number;
  name: string;
  description: string;
  price: number;
  sku: string;
  stockQuantity: number;
  isActive: boolean;
  categoryId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateProductDTO {
  name: string;
  description: string;
  price: number;
  sku: string;
  stockQuantity: number;
  categoryId?: number;
}

export interface UpdateProductDTO {
  name?: string;
  description?: string;
  price?: number;
  stockQuantity?: number;
  isActive?: boolean;
  categoryId?: number;
}
```

**Key Points:**
- Extend `BaseModel` for consistent id/timestamps
- Create separate DTOs for create/update operations
- Use optional fields (`?`) where appropriate
- DTOs should NOT include id, createdAt, updatedAt

### Step 3: Create the Repository

**File: `src/features/products/product.repository.ts`**

```typescript
import { BaseRepository } from '../../core/database/base-repository';
import { Product } from './product.model';
import { Filter } from '../../types';

export class ProductRepository extends BaseRepository<Product> {
  protected tableName = 'PRODUCTS';
  protected idColumn = 'PRODUCT_ID';

  /**
   * Map Oracle table row to Product model
   * Column names are UPPERCASE (Oracle convention)
   */
  protected mapRowToModel(row: any): Product {
    return {
      id: row.PRODUCT_ID,
      name: row.NAME,
      description: row.DESCRIPTION,
      price: parseFloat(row.PRICE),
      sku: row.SKU,
      stockQuantity: row.STOCK_QUANTITY,
      isActive: row.IS_ACTIVE === 1,
      categoryId: row.CATEGORY_ID,
      createdAt: new Date(row.CREATED_AT),
      updatedAt: new Date(row.UPDATED_AT),
    };
  }

  /**
   * Map Product model to Oracle table row
   * Only include fields that are being set/updated
   */
  protected mapModelToRow(model: Partial<Product>): any {
    const row: any = {};

    if (model.name !== undefined) row.NAME = model.name;
    if (model.description !== undefined) row.DESCRIPTION = model.description;
    if (model.price !== undefined) row.PRICE = model.price;
    if (model.sku !== undefined) row.SKU = model.sku;
    if (model.stockQuantity !== undefined) row.STOCK_QUANTITY = model.stockQuantity;
    if (model.isActive !== undefined) row.IS_ACTIVE = model.isActive ? 1 : 0;
    if (model.categoryId !== undefined) row.CATEGORY_ID = model.categoryId;

    return row;
  }

  /**
   * Custom query methods go here
   * Example: Find products by category
   */
  async findByCategory(categoryId: number): Promise<Product[]> {
    const filters: Filter[] = [
      { field: 'categoryId', operator: 'eq', value: categoryId }
    ];
    const result = await this.findAll(filters);
    return result.data;
  }

  /**
   * Example: Find products below stock threshold
   */
  async findLowStock(threshold: number): Promise<Product[]> {
    const filters: Filter[] = [
      { field: 'stockQuantity', operator: 'lt', value: threshold }
    ];
    const result = await this.findAll(filters);
    return result.data;
  }
}
```

**Key Points:**
- Inherit from `BaseRepository<Product>` for automatic CRUD
- Override `mapRowToModel` and `mapModelToRow` for column mapping
- Oracle columns are UPPERCASE by convention
- Boolean fields: Oracle stores as 0/1, convert to boolean
- Add custom query methods as needed
- The base repository provides: `findById`, `findAll`, `create`, `update`, `delete`

### Step 4: Create Validation Schemas

**File: `src/features/products/product.validation.ts`**

```typescript
import Joi from 'joi';
import { CreateProductDTO, UpdateProductDTO } from './product.model';

/**
 * Validation schema for creating a product
 * All required fields must be present
 */
export const createProductSchema = Joi.object<CreateProductDTO>({
  name: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'Product name must be at least 3 characters',
      'string.max': 'Product name cannot exceed 100 characters',
      'any.required': 'Product name is required',
    }),

  description: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'Description must be at least 10 characters',
      'string.max': 'Description cannot exceed 500 characters',
    }),

  price: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      'number.positive': 'Price must be a positive number',
      'number.precision': 'Price cannot have more than 2 decimal places',
    }),

  sku: Joi.string()
    .pattern(/^[A-Z0-9-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'SKU must contain only uppercase letters, numbers, and hyphens',
    }),

  stockQuantity: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.min': 'Stock quantity cannot be negative',
    }),

  categoryId: Joi.number()
    .integer()
    .optional()
    .allow(null),
});

/**
 * Validation schema for updating a product
 * All fields are optional (partial update)
 */
export const updateProductSchema = Joi.object<UpdateProductDTO>({
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().min(10).max(500).optional(),
  price: Joi.number().positive().precision(2).optional(),
  stockQuantity: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
  categoryId: Joi.number().integer().optional().allow(null),
}).min(1); // At least one field must be provided

/**
 * Validation schema for query parameters
 */
export const productQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  categoryId: Joi.number().integer().optional(),
  isActive: Joi.boolean().optional(),
});
```

**Key Points:**
- Create separate schemas for create/update/query operations
- Use custom error messages for better UX
- Update schemas should allow partial updates (`.optional()`)
- Query schemas should have `.default()` values
- Use `.allow(null)` for nullable foreign keys
- Patterns (`Joi.string().pattern()`) for format validation

### Step 5: Create the Service Layer

**File: `src/features/products/product.service.ts`**

```typescript
import { ProductRepository } from './product.repository';
import { Product, CreateProductDTO, UpdateProductDTO } from './product.model';
import { NotFoundError, ValidationError } from '../../core/middleware/error.middleware';
import { PaginatedResult, PaginationParams, Filter } from '../../types';
import { getCache, setCache, deleteCache } from '../../core/cache/redis';
import logger from '../../core/logger';

export class ProductService {
  private repository: ProductRepository;

  constructor() {
    this.repository = new ProductRepository();
  }

  /**
   * Get product by ID with caching
   */
  async getProductById(id: number): Promise<Product> {
    // Try cache first
    const cacheKey = `product:${id}`;
    const cached = await getCache<Product>(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for product ${id}`);
      return cached;
    }

    // Fetch from database
    const product = await this.repository.findById(id);
    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    // Cache for 5 minutes
    await setCache(cacheKey, product, 300);
    return product;
  }

  /**
   * List products with pagination and filtering
   */
  async listProducts(
    pagination: PaginationParams,
    filters?: { categoryId?: number; isActive?: boolean }
  ): Promise<PaginatedResult<Product>> {
    const filterArray: Filter[] = [];

    if (filters?.categoryId !== undefined) {
      filterArray.push({ field: 'categoryId', operator: 'eq', value: filters.categoryId });
    }

    if (filters?.isActive !== undefined) {
      filterArray.push({ field: 'isActive', operator: 'eq', value: filters.isActive });
    }

    return await this.repository.findAll(filterArray, pagination);
  }

  /**
   * Create a new product
   */
  async createProduct(dto: CreateProductDTO): Promise<Product> {
    // Business logic validation
    await this.validateUniqueSKU(dto.sku);

    // Create in database
    const product = await this.repository.create(dto);

    logger.info(`Product created: ${product.id}`, { productId: product.id });
    return product;
  }

  /**
   * Update an existing product
   */
  async updateProduct(id: number, dto: UpdateProductDTO): Promise<Product> {
    // Check if product exists
    await this.getProductById(id);

    // If SKU is being updated, validate uniqueness
    if (dto.sku) {
      await this.validateUniqueSKU(dto.sku, id);
    }

    // Update in database
    const updated = await this.repository.update(id, dto);
    if (!updated) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    // Invalidate cache
    await deleteCache(`product:${id}`);

    logger.info(`Product updated: ${id}`, { productId: id });
    return updated;
  }

  /**
   * Delete a product (soft delete by setting isActive = false)
   */
  async deleteProduct(id: number): Promise<void> {
    const product = await this.getProductById(id);

    await this.repository.update(id, { isActive: false });
    await deleteCache(`product:${id}`);

    logger.info(`Product deleted: ${id}`, { productId: id });
  }

  /**
   * Get products with low stock
   */
  async getLowStockProducts(threshold: number = 10): Promise<Product[]> {
    return await this.repository.findLowStock(threshold);
  }

  /**
   * Private helper: Validate SKU is unique
   */
  private async validateUniqueSKU(sku: string, excludeId?: number): Promise<void> {
    const filters: Filter[] = [
      { field: 'sku', operator: 'eq', value: sku }
    ];

    const existing = await this.repository.findAll(filters);

    // If we find a product with this SKU (and it's not the one we're updating)
    if (existing.data.length > 0 && existing.data[0].id !== excludeId) {
      throw new ValidationError(`Product with SKU '${sku}' already exists`);
    }
  }
}
```

**Key Points:**
- Service layer contains business logic, NOT in controllers
- Use caching for frequently accessed data
- Validate business rules (e.g., unique SKU)
- Throw appropriate errors (`NotFoundError`, `ValidationError`)
- Log important operations with context
- Invalidate cache after updates
- Use private methods for reusable logic

### Step 6: Create the Controller with TSOA Annotations

**File: `src/features/products/product.controller.ts`**

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Route,
  Tags,
  Path,
  Body,
  Query,
  Security,
  SuccessResponse,
  Response,
} from 'tsoa';
import { ProductService } from './product.service';
import { Product, CreateProductDTO, UpdateProductDTO } from './product.model';
import { PaginatedResult } from '../../types';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from './product.validation';
import { ValidationError } from '../../core/middleware/error.middleware';

/**
 * Products controller
 * Handles all product-related HTTP endpoints
 */
@Route('api/v1/products')
@Tags('Products')
export class ProductController extends Controller {
  private service: ProductService;

  constructor() {
    super();
    this.service = new ProductService();
  }

  /**
   * Get a product by ID
   *
   * @param id Product ID
   * @returns Product object
   * @example id 123
   */
  @Get('{id}')
  @Security('apiKey')
  @Security('sso')
  @Response<{ message: string }>(404, 'Product not found')
  @SuccessResponse(200, 'Product retrieved successfully')
  public async getProduct(@Path() id: number): Promise<Product> {
    return await this.service.getProductById(id);
  }

  /**
   * List all products with pagination and filtering
   *
   * @param page Page number (default: 1)
   * @param limit Items per page (default: 20, max: 100)
   * @param categoryId Filter by category ID
   * @param isActive Filter by active status
   * @returns Paginated list of products
   */
  @Get()
  @Security('apiKey')
  @Security('sso')
  @SuccessResponse(200, 'Products retrieved successfully')
  public async listProducts(
    @Query() page: number = 1,
    @Query() limit: number = 20,
    @Query() categoryId?: number,
    @Query() isActive?: boolean
  ): Promise<PaginatedResult<Product>> {
    // Validate query parameters
    const { error, value } = productQuerySchema.validate({
      page,
      limit,
      categoryId,
      isActive,
    });

    if (error) {
      throw new ValidationError('Invalid query parameters', error.details);
    }

    const pagination = {
      page: value.page,
      limit: value.limit,
      offset: (value.page - 1) * value.limit,
    };

    const filters = {
      categoryId: value.categoryId,
      isActive: value.isActive,
    };

    return await this.service.listProducts(pagination, filters);
  }

  /**
   * Create a new product
   *
   * @param requestBody Product creation data
   * @returns Created product
   */
  @Post()
  @Security('apiKey')
  @Security('sso')
  @Response<{ message: string }>(400, 'Validation error')
  @SuccessResponse(201, 'Product created successfully')
  public async createProduct(
    @Body() requestBody: CreateProductDTO
  ): Promise<Product> {
    // Validate request body
    const { error, value } = createProductSchema.validate(requestBody);
    if (error) {
      throw new ValidationError('Validation failed', error.details);
    }

    const product = await this.service.createProduct(value);

    // Set HTTP 201 Created status
    this.setStatus(201);
    return product;
  }

  /**
   * Update an existing product
   *
   * @param id Product ID to update
   * @param requestBody Product update data (partial)
   * @returns Updated product
   */
  @Put('{id}')
  @Security('apiKey')
  @Security('sso')
  @Response<{ message: string }>(404, 'Product not found')
  @Response<{ message: string }>(400, 'Validation error')
  @SuccessResponse(200, 'Product updated successfully')
  public async updateProduct(
    @Path() id: number,
    @Body() requestBody: UpdateProductDTO
  ): Promise<Product> {
    // Validate request body
    const { error, value } = updateProductSchema.validate(requestBody);
    if (error) {
      throw new ValidationError('Validation failed', error.details);
    }

    return await this.service.updateProduct(id, value);
  }

  /**
   * Delete a product (soft delete)
   *
   * @param id Product ID to delete
   */
  @Delete('{id}')
  @Security('apiKey')
  @Security('sso')
  @Response<{ message: string }>(404, 'Product not found')
  @SuccessResponse(204, 'Product deleted successfully')
  public async deleteProduct(@Path() id: number): Promise<void> {
    await this.service.deleteProduct(id);
    this.setStatus(204);
  }

  /**
   * Get products with low stock
   *
   * @param threshold Stock quantity threshold (default: 10)
   * @returns List of low stock products
   */
  @Get('low-stock')
  @Security('apiKey')
  @Security('sso')
  @SuccessResponse(200, 'Low stock products retrieved')
  public async getLowStockProducts(
    @Query() threshold: number = 10
  ): Promise<Product[]> {
    return await this.service.getLowStockProducts(threshold);
  }
}
```

**Key TSOA Annotations:**

- `@Route('api/v1/products')`: Base path for all endpoints in this controller
- `@Tags('Products')`: Groups endpoints in Swagger UI
- `@Get()`, `@Post()`, `@Put()`, `@Delete()`: HTTP methods
- `@Path()`: URL path parameter (e.g., `/products/{id}`)
- `@Query()`: Query string parameter (e.g., `?page=1`)
- `@Body()`: Request body
- `@Security()`: Authentication requirements
- `@Response()`: Document error responses
- `@SuccessResponse()`: Document success responses
- JSDoc comments become Swagger descriptions

### Step 7: Create Tests

**File: `src/features/products/product.service.test.ts`**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductService } from './product.service';
import { ProductRepository } from './product.repository';
import { NotFoundError, ValidationError } from '../../core/middleware/error.middleware';

// Mock the repository
vi.mock('./product.repository');

describe('ProductService', () => {
  let service: ProductService;
  let mockRepository: any;

  beforeEach(() => {
    service = new ProductService();
    mockRepository = vi.mocked(ProductRepository).prototype;
  });

  describe('getProductById', () => {
    it('should return a product when found', async () => {
      const mockProduct = {
        id: 1,
        name: 'Test Product',
        price: 99.99,
        sku: 'TEST-001',
        stockQuantity: 100,
        isActive: true,
      };

      mockRepository.findById.mockResolvedValue(mockProduct);

      const result = await service.getProductById(1);

      expect(result).toEqual(mockProduct);
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when product does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getProductById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('createProduct', () => {
    it('should create a product with valid data', async () => {
      const createDto = {
        name: 'New Product',
        description: 'A great product',
        price: 49.99,
        sku: 'NEW-001',
        stockQuantity: 50,
      };

      const createdProduct = { id: 1, ...createDto, isActive: true };

      mockRepository.findAll.mockResolvedValue({ data: [] }); // SKU is unique
      mockRepository.create.mockResolvedValue(createdProduct);

      const result = await service.createProduct(createDto);

      expect(result).toEqual(createdProduct);
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw ValidationError for duplicate SKU', async () => {
      const createDto = {
        name: 'New Product',
        description: 'A great product',
        price: 49.99,
        sku: 'DUPLICATE',
        stockQuantity: 50,
      };

      // Mock: SKU already exists
      mockRepository.findAll.mockResolvedValue({
        data: [{ id: 999, sku: 'DUPLICATE' }],
      });

      await expect(service.createProduct(createDto)).rejects.toThrow(ValidationError);
    });
  });
});
```

### Step 8: Register the Routes

**File: `src/server.ts`** (add to existing code)

```typescript
// After running: npm run tsoa:generate
// Uncomment these lines:
import { RegisterRoutes } from './generated/routes';

// In initializeRoutes function:
RegisterRoutes(app);
```

### Step 9: Generate Swagger Documentation

```bash
# Generate routes and Swagger spec
npm run tsoa:generate

# This creates:
# - src/generated/routes.ts (route registration)
# - public/swagger.json (OpenAPI spec)
```

### Step 10: Test Your Endpoints

```bash
# Start the server
npm run dev

# Test GET /api/v1/products
curl http://localhost:3000/api/v1/products?page=1&limit=10

# Test POST /api/v1/products
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "name": "Amazing Product",
    "description": "This is an amazing product",
    "price": 29.99,
    "sku": "AMAZ-001",
    "stockQuantity": 100
  }'

# Test GET /api/v1/products/{id}
curl http://localhost:3000/api/v1/products/1

# View Swagger documentation
# Open: http://localhost:3000/api-docs
```

---

## Database Layer

### Understanding the Base Repository

All repositories extend `BaseRepository<T>` which provides:

```typescript
// Automatically available methods:
findById(id: number): Promise<T | null>
findAll(filters?: Filter[], pagination?: PaginationParams): Promise<PaginatedResult<T>>
create(model: Partial<T>): Promise<T>
update(id: number, model: Partial<T>): Promise<T | null>
delete(id: number): Promise<boolean>
```

### Custom Repository Methods

Add domain-specific queries to your repository:

```typescript
export class ProductRepository extends BaseRepository<Product> {
  // ... base setup ...

  /**
   * Find products by price range
   */
  async findByPriceRange(minPrice: number, maxPrice: number): Promise<Product[]> {
    const filters: Filter[] = [
      { field: 'price', operator: 'gte', value: minPrice },
      { field: 'price', operator: 'lte', value: maxPrice },
    ];
    const result = await this.findAll(filters);
    return result.data;
  }

  /**
   * Get total inventory value
   */
  async getTotalInventoryValue(): Promise<number> {
    // For complex queries, implement raw SQL here
    // This is a STUB - you'll implement with oracledb
    return 0;
  }
}
```

### Filter Operators

Available filter operators:

- `eq`: Equal to
- `ne`: Not equal to
- `gt`: Greater than
- `gte`: Greater than or equal
- `lt`: Less than
- `lte`: Less than or equal
- `like`: SQL LIKE pattern
- `in`: In array of values

---

## Validation

### Joi Schema Best Practices

```typescript
// 1. Use TypeScript generics for type safety
const schema = Joi.object<YourDTO>({...});

// 2. Provide custom error messages
Joi.string().required().messages({
  'any.required': 'Field X is required',
  'string.min': 'Field X must be at least {#limit} characters'
});

// 3. Set defaults for optional fields
Joi.number().default(10)

// 4. Use transforms for normalization
Joi.string().lowercase().trim()

// 5. Cross-field validation
Joi.object({
  password: Joi.string().required(),
  confirmPassword: Joi.string().valid(Joi.ref('password'))
});

// 6. Conditional validation
Joi.object({
  type: Joi.string().valid('physical', 'digital'),
  weight: Joi.when('type', {
    is: 'physical',
    then: Joi.number().required(),
    otherwise: Joi.forbidden()
  })
});
```

### Validation in Controllers

```typescript
@Post()
public async createResource(@Body() requestBody: CreateDTO): Promise<Resource> {
  // Always validate in controller
  const { error, value } = schema.validate(requestBody, {
    abortEarly: false, // Return all errors, not just first
    stripUnknown: true, // Remove unknown fields
  });

  if (error) {
    throw new ValidationError('Validation failed', error.details);
  }

  // Use validated 'value', not 'requestBody'
  return await this.service.create(value);
}
```

---

## Authentication & Authorization

### Two Authentication Methods

**1. SSO Authentication (for internal users)**

User authenticated by upstream SAML, receives `identityId` header:

```typescript
@Security('sso')
```

**2. API Key Authentication (for external partners)**

Client provides API key in header:

```typescript
@Security('apiKey')
```

**Both** (user can authenticate either way):

```typescript
@Security('apiKey')
@Security('sso')
```

### Accessing User Context

In your controller/service, access the authenticated user:

```typescript
import { AuthenticatedRequest } from '../../types';

// In Express route handler (not TSOA):
app.get('/example', async (req: AuthenticatedRequest, res) => {
  if (req.isApiKeyAuth) {
    console.log('Authenticated via API key:', req.apiKeyId);
  } else {
    console.log('Authenticated via SSO:', req.identityId);
  }
});
```

### Role-Based Authorization

For role-based access, add authorization logic in services:

```typescript
export class ProductService {
  async deleteProduct(id: number, userId: string): Promise<void> {
    // Check if user has permission
    const hasPermission = await this.checkDeletePermission(userId);
    if (!hasPermission) {
      throw new ForbiddenError('You do not have permission to delete products');
    }

    await this.repository.update(id, { isActive: false });
  }
}
```

---

## Error Handling

### Built-in Error Classes

```typescript
import {
  HttpError,           // Base error (statusCode, message, errors?)
  ValidationError,     // 400 - Invalid input
  UnauthorizedError,   // 401 - Not authenticated
  ForbiddenError,      // 403 - Not authorized
  NotFoundError,       // 404 - Resource not found
} from '../../core/middleware/error.middleware';
```

### Throwing Errors

```typescript
// In service layer
throw new NotFoundError(`Product ${id} not found`);
throw new ValidationError('Invalid SKU format');
throw new ForbiddenError('You cannot modify this resource');

// With validation details
throw new ValidationError('Validation failed', [
  { field: 'email', message: 'Invalid email format' },
  { field: 'age', message: 'Must be 18 or older' }
]);
```

### Error Response Format

All errors return consistent format:

```json
{
  "statusCode": 404,
  "message": "Product 123 not found",
  "timestamp": "2025-10-28T12:34:56.789Z",
  "path": "/api/v1/products/123",
  "requestId": "abc-123-def-456",
  "errors": [
    { "field": "email", "message": "Invalid format" }
  ]
}
```

### Custom Error Handling

For domain-specific errors:

```typescript
export class InsufficientStockError extends HttpError {
  constructor(productId: number, available: number, requested: number) {
    super(
      400,
      `Insufficient stock for product ${productId}. Available: ${available}, Requested: ${requested}`
    );
    this.name = 'InsufficientStockError';
  }
}
```

---

## Testing

### Running Tests

```bash
npm test              # Run all tests
npm run test:ui       # Run with Vitest UI
npm run test:coverage # Generate coverage report
```

### Writing Unit Tests

**Service Tests:**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(() => {
    // Fresh instance for each test
    service = new ProductService();
  });

  it('should do something', async () => {
    // Arrange
    const input = { ... };

    // Act
    const result = await service.someMethod(input);

    // Assert
    expect(result).toEqual(expectedOutput);
  });
});
```

**Mocking Dependencies:**

```typescript
// Mock the repository
vi.mock('./product.repository', () => ({
  ProductRepository: vi.fn().mockImplementation(() => ({
    findById: vi.fn(),
    create: vi.fn(),
  })),
}));

// Use the mock
const mockRepo = vi.mocked(ProductRepository).prototype;
mockRepo.findById.mockResolvedValue(mockProduct);
```

**Validation Tests:**

```typescript
import { createProductSchema } from './product.validation';

describe('Product Validation', () => {
  it('should validate correct product data', () => {
    const validData = {
      name: 'Test Product',
      description: 'A test product',
      price: 29.99,
      sku: 'TEST-001',
      stockQuantity: 100,
    };

    const { error } = createProductSchema.validate(validData);
    expect(error).toBeUndefined();
  });

  it('should reject invalid price', () => {
    const invalidData = {
      name: 'Test Product',
      description: 'A test product',
      price: -10, // Invalid: negative
      sku: 'TEST-001',
      stockQuantity: 100,
    };

    const { error } = createProductSchema.validate(invalidData);
    expect(error).toBeDefined();
    expect(error?.details[0].path).toContain('price');
  });
});
```

---

## Debugging

### VS Code Debugging (Recommended)

1. **Set a breakpoint** in your TypeScript file (click left of line number)
2. **Press F5** or select "Launch Server (Watch Mode)"
3. **Make a request** to your endpoint
4. Execution **pauses at breakpoint**
5. **Inspect variables**, step through code, view call stack

### Debug Configuration

Two configurations available (`.vscode/launch.json`):

- **Launch Server**: Build once, then run
- **Launch Server (Watch Mode)**: Auto-rebuild on file changes

### Logging Best Practices

```typescript
import logger from '../../core/logger';

// Info: Normal operations
logger.info('Product created', { productId: product.id });

// Warn: Unusual but handled
logger.warn('Low stock detected', { productId, stockLevel });

// Error: Something went wrong
logger.error('Failed to process order', {
  orderId,
  error: error.message,
  stack: error.stack
});

// Debug: Detailed troubleshooting (only in dev)
logger.debug('Cache miss', { cacheKey });

// Include request ID for correlation
logger.info('Processing request', { requestId: req.id, userId });
```

### Request ID Tracking

Every request has a unique ID in logs and errors:

```
2025-10-28 12:34:56 [abc-123-def] info: GET /api/v1/products/5
2025-10-28 12:34:57 [abc-123-def] error: Product not found
```

Users can report the request ID from error response:

```json
{ "requestId": "abc-123-def", "message": "Product not found" }
```

Search logs by request ID to trace the entire request lifecycle.

---

## API Documentation with TSOA

### Understanding TSOA

**TSOA** stands for **TypeScript OpenAPI** (also called TypeScript to OpenAPI). While many developers think it's just for Swagger generation, TSOA is actually much more powerful.

#### What TSOA Does

**1. Automatic Route Generation (Primary Feature)**

TSOA generates actual Express route handlers from your decorated controllers. You never write Express routes manually:

```typescript
// You write this:
@Route('api/v1/products')
export class ProductController extends Controller {
  @Get('{id}')
  public async getProduct(@Path() id: number): Promise<Product> {
    return await this.service.getProductById(id);
  }
}

// TSOA generates this in src/generated/routes.ts:
router.get('/api/v1/products/:id', async (req, res, next) => {
  const controller = new ProductController();
  const validatedArgs = { id: Number(req.params.id) };
  const result = await controller.getProduct(validatedArgs.id);
  res.json(result);
});
```

**2. Runtime Type Validation**

TSOA validates request data against your TypeScript types at runtime:

```typescript
@Get('{id}')
public async getProduct(@Path() id: number): Promise<Product>
//                              ^^^^^^
// TSOA ensures this is actually a number at runtime
// Automatically converts "123" → 123
// Rejects "abc" with 400 validation error
```

**3. OpenAPI/Swagger Specification**

Generates `swagger.json` (OpenAPI 3.0 spec) from your code, which powers:
- Swagger UI documentation at `/api-docs`
- API client generation for partners
- Contract testing
- API versioning documentation

**4. Type Safety Between API Contract and Implementation**

Your TypeScript types ARE your API contract. Everything stays in sync:

```typescript
interface CreateProductDTO {
  name: string;
  price: number;
}

@Post()
public async create(@Body() body: CreateProductDTO): Promise<Product>
//                          ^^^^^^^^^^^^^^^^^^
// Swagger documents exactly these fields
// Runtime validates exactly these fields
// TypeScript ensures you handle exactly these fields

// Change the DTO → Everything updates automatically:
// ✓ TypeScript compilation
// ✓ Generated routes
// ✓ Generated Swagger docs
// ✓ Runtime validation
```

**5. Request/Response Transformation**

Handles serialization/deserialization automatically:

```typescript
@Get('{id}')
public async getProduct(@Path() id: number): Promise<Product> {
  // You return: { id: 1, createdAt: new Date('2025-10-28') }
  // TSOA transforms to: { "id": 1, "createdAt": "2025-10-28T..." }
}
```

**6. Authentication/Security Integration**

Maps security decorators to your middleware:

```typescript
@Security('apiKey')
@Get('{id}')
// TSOA ensures your auth middleware is called before this endpoint
```

#### Key Benefits

**Single Source of Truth**
- TypeScript types define everything
- No separate API spec to maintain
- Documentation can never be out of sync

**Compile-Time + Runtime Safety**
- TypeScript catches type errors at compile time
- TSOA validates actual runtime requests
- No more `req.body.price` that might secretly be a string

**Less Boilerplate**
- No manual Express route registration
- No manual validation code
- No manual Swagger YAML writing

**Better Developer Experience**
- IntelliSense for your API contracts
- Refactor with confidence (rename fields, everything updates)
- Generated Swagger UI for testing

#### How TSOA Fits in This Project

```
Developer writes:
  ProductController with @Route, @Get, @Post decorators

npm run tsoa:generate creates:
  1. src/generated/routes.ts (Express route handlers)
  2. public/swagger.json (OpenAPI specification)

Server startup:
  RegisterRoutes(app) mounts all routes
  swaggerUi.setup() enables interactive docs

Result:
  ✓ Fully working, type-safe API endpoints
  ✓ Interactive Swagger UI documentation
  ✓ No manual route or validation code
```

#### What TSOA Doesn't Do

- ❌ Database operations (use repositories)
- ❌ Business logic (use services)
- ❌ Complex validation rules (use Joi for that)
- ❌ Replace Express (it generates Express routes)

**Bottom line:** TSOA is a **code generator** that bridges TypeScript type safety and runtime Express applications, with OpenAPI documentation as a bonus output.

---

### TSOA Annotations Reference

```typescript
// Controller-level
@Route('api/v1/resources')    // Base path
@Tags('Resources')             // Swagger group

// Method-level
@Get('{id}')                   // GET /api/v1/resources/{id}
@Post()                        // POST /api/v1/resources
@Put('{id}')                   // PUT /api/v1/resources/{id}
@Delete('{id}')                // DELETE /api/v1/resources/{id}

// Parameters
@Path() id: number             // URL parameter {id}
@Query() page: number          // Query string ?page=1
@Body() body: CreateDTO        // Request body
@Header() authToken: string    // Header value

// Security
@Security('apiKey')            // Requires API key
@Security('sso')               // Requires SSO

// Response documentation
@SuccessResponse(200, 'OK')
@Response<ErrorType>(404, 'Not Found')

// Examples
@Example({
  id: 1,
  name: 'Sample Product',
  price: 29.99
})
```

### Generating Documentation

```bash
# 1. Add TSOA annotations to your controller
# 2. Run generation
npm run tsoa:generate

# 3. Uncomment routes in src/server.ts
import { RegisterRoutes } from './generated/routes';
RegisterRoutes(app);

# 4. Uncomment Swagger UI in src/server.ts
import swaggerDocument from '../public/swagger.json' assert { type: 'json' };
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

# 5. Restart server and visit http://localhost:3000/api-docs
```

### JSDoc for Swagger Descriptions

```typescript
/**
 * Get a product by ID
 *
 * This endpoint retrieves a single product by its unique identifier.
 * Products are cached for 5 minutes to improve performance.
 *
 * @param id Product ID
 * @returns Product object with all details
 * @example id 123
 */
@Get('{id}')
public async getProduct(@Path() id: number): Promise<Product> {
  return await this.service.getProductById(id);
}
```

The JSDoc comments become endpoint descriptions in Swagger UI.

---

## Code Formatting

We use **Prettier** for automatic code formatting to maintain consistent code style across the team. Prettier is configured to format on save in VS Code and can also be run manually.

### Why Prettier?

- **Consistency**: Everyone's code looks the same, reducing cognitive load in code reviews
- **No debates**: No need to argue about code style preferences
- **Automatic**: Formats on save, no manual effort required
- **Integration**: Works seamlessly with TypeScript, JSON, and other files

### Prettier Configuration

Our Prettier settings are in `.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "bracketSpacing": true,
  "endOfLine": "lf"
}
```

#### What Each Rule Does

**`"semi": true`**
- **Purpose**: Require semicolons at the end of statements
- **Example**:
  ```typescript
  // ✓ Correct
  const x = 5;

  // ✗ Without semicolons
  const x = 5
  ```

**`"trailingComma": "es5"`**
- **Purpose**: Add trailing commas where valid in ES5 (objects, arrays)
- **Why**: Makes git diffs cleaner when adding items
- **Example**:
  ```typescript
  // ✓ Correct
  const obj = {
    name: 'Product',
    price: 99,  // ← trailing comma
  };

  // ✗ Without trailing comma
  const obj = {
    name: 'Product',
    price: 99
  };
  ```

**`"singleQuote": true`**
- **Purpose**: Use single quotes instead of double quotes
- **Example**:
  ```typescript
  // ✓ Correct
  const message = 'Hello world';

  // ✗ Double quotes
  const message = "Hello world";
  ```

**`"printWidth": 100`**
- **Purpose**: Wrap lines that exceed 100 characters
- **Why**: Balance between readability and screen space
- **Example**:
  ```typescript
  // ✓ Wraps long lines
  const result = someVeryLongFunctionName(
    firstParameter,
    secondParameter,
    thirdParameter
  );

  // ✗ Too long (would wrap if over 100 chars)
  const result = someVeryLongFunctionName(firstParameter, secondParameter, thirdParameter, fourthParameter, fifthParameter);
  ```

**`"tabWidth": 2`**
- **Purpose**: Use 2 spaces for indentation
- **Why**: Standard for TypeScript/JavaScript projects
- **Example**:
  ```typescript
  // ✓ 2 spaces
  function example() {
    if (true) {
      console.log('indented');
    }
  }
  ```

**`"useTabs": false`**
- **Purpose**: Use spaces instead of tab characters
- **Why**: Ensures consistent rendering across all editors

**`"arrowParens": "always"`**
- **Purpose**: Always include parentheses around arrow function parameters
- **Example**:
  ```typescript
  // ✓ Correct
  const double = (x) => x * 2;

  // ✗ Without parens (not allowed)
  const double = x => x * 2;
  ```

**`"bracketSpacing": true`**
- **Purpose**: Add spaces inside object literal braces
- **Example**:
  ```typescript
  // ✓ With spacing
  const obj = { name: 'John' };

  // ✗ Without spacing
  const obj = {name: 'John'};
  ```

**`"endOfLine": "lf"`**
- **Purpose**: Use Unix-style line endings (LF) instead of Windows (CRLF)
- **Why**: Consistency across different operating systems
- **Note**: Git is configured to handle this automatically on Windows

### Using Prettier

**Automatic Formatting (Recommended)**

VS Code is configured to format on save. Just save your file (`Ctrl+S` or `Cmd+S`) and Prettier runs automatically.

**Manual Formatting**

```bash
# Format all files in src/
npm run format

# Check formatting without changing files (useful for CI)
npm run format:check
```

**Format Single File in VS Code**

- Right-click in file → "Format Document"
- Or: `Shift+Alt+F` (Windows/Linux) / `Shift+Option+F` (Mac)

### VS Code Setup

The `.vscode/settings.json` file configures Prettier for the team:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

**First Time Setup:**

1. Install the Prettier extension in VS Code:
   - Open Extensions (`Ctrl+Shift+X`)
   - Search for "Prettier - Code formatter"
   - Install `esbenp.prettier-vscode`

2. Restart VS Code

3. Files will now format automatically on save!

### Files Excluded from Formatting

The `.prettierignore` file excludes:

- `node_modules/` - Third-party code
- `dist/` and `build/` - Generated output
- `src/generated/` - TSOA generated files
- `coverage/` - Test coverage reports
- `public/swagger.json` - Generated Swagger spec
- `package-lock.json` - Lock file (don't format)

### Best Practices

✅ **DO:**
- Let Prettier format everything - don't fight it
- Commit formatted code (no "formatting-only" commits in PRs)
- Install Prettier extension in VS Code
- Enable format on save

❌ **DON'T:**
- Manually format code (let Prettier do it)
- Disable Prettier for specific files without good reason
- Mix formatted and unformatted code in the same commit
- Override Prettier settings locally

### CI/CD Integration

In CI/CD pipelines, we check formatting:

```bash
npm run format:check
```

If this fails, the build will fail. Run `npm run format` locally to fix.

---

## Best Practices

### 1. Code Organization

✅ **DO:**
- Keep all related files in the same feature folder
- Name files consistently: `feature.model.ts`, `feature.service.ts`, etc.
- Export types from model files
- Import from feature folders, not individual files

❌ **DON'T:**
- Mix different features in the same folder
- Create "helpers" or "utils" folders that become dumping grounds
- Import across features (features should be independent)

### 2. Type Safety

✅ **DO:**
- Define TypeScript interfaces for all data structures
- Use DTOs for create/update operations
- Let TypeScript infer return types when obvious
- Use `Partial<T>` for optional updates

❌ **DON'T:**
- Use `any` type (use `unknown` if truly unknown)
- Ignore TypeScript errors
- Cast types without validation

### 3. Error Handling

✅ **DO:**
- Throw specific error types (`NotFoundError`, `ValidationError`)
- Include helpful error messages
- Log errors with context
- Return consistent error format

❌ **DON'T:**
- Swallow errors silently
- Return error strings instead of throwing
- Expose internal implementation details in error messages

### 4. Validation

✅ **DO:**
- Validate all input in controllers
- Use Joi schemas with TypeScript types
- Provide custom error messages
- Validate in service layer for business rules

❌ **DON'T:**
- Trust user input
- Skip validation for "internal" endpoints
- Validate the same data multiple times

### 5. Database

✅ **DO:**
- Use repository pattern for all database access
- Map Oracle columns to camelCase properties
- Use filters for dynamic queries
- Add custom repository methods for complex queries

❌ **DON'T:**
- Write SQL in service or controller layers
- Return database rows directly (always map to models)
- Build SQL strings with concatenation

### 6. Caching

✅ **DO:**
- Cache frequently accessed data
- Set appropriate TTL (time to live)
- Invalidate cache on updates
- Handle cache misses gracefully

❌ **DON'T:**
- Cache sensitive data without encryption
- Set very long TTLs on data that changes
- Forget to invalidate stale cache

### 7. Logging

✅ **DO:**
- Log important business events
- Include context (IDs, user info)
- Use appropriate log levels
- Include request ID for correlation

❌ **DON'T:**
- Log sensitive data (passwords, tokens)
- Log excessively in tight loops
- Use console.log (use logger)

---

## Common Patterns

### Pattern: Soft Delete

```typescript
// Instead of actually deleting, set isActive = false
async deleteProduct(id: number): Promise<void> {
  await this.repository.update(id, { isActive: false });
}

// Filter out inactive by default
async listProducts(): Promise<Product[]> {
  const filters: Filter[] = [
    { field: 'isActive', operator: 'eq', value: true }
  ];
  return await this.repository.findAll(filters);
}
```

### Pattern: Audit Fields

```typescript
// Track who created/updated
export interface AuditedModel extends BaseModel {
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Set in service layer
async createProduct(dto: CreateProductDTO, userId: string): Promise<Product> {
  const product = {
    ...dto,
    createdBy: userId,
    createdAt: new Date(),
  };
  return await this.repository.create(product);
}
```

### Pattern: Batch Operations

```typescript
async createMany(dtos: CreateProductDTO[]): Promise<Product[]> {
  const results: Product[] = [];

  for (const dto of dtos) {
    const product = await this.repository.create(dto);
    results.push(product);
  }

  return results;
}
```

### Pattern: Search with Multiple Filters

```typescript
async searchProducts(criteria: {
  name?: string;
  minPrice?: number;
  maxPrice?: number;
  categoryId?: number;
}): Promise<Product[]> {
  const filters: Filter[] = [];

  if (criteria.name) {
    filters.push({ field: 'name', operator: 'like', value: `%${criteria.name}%` });
  }
  if (criteria.minPrice !== undefined) {
    filters.push({ field: 'price', operator: 'gte', value: criteria.minPrice });
  }
  if (criteria.maxPrice !== undefined) {
    filters.push({ field: 'price', operator: 'lte', value: criteria.maxPrice });
  }
  if (criteria.categoryId) {
    filters.push({ field: 'categoryId', operator: 'eq', value: criteria.categoryId });
  }

  const result = await this.repository.findAll(filters);
  return result.data;
}
```

### Pattern: Transactional Operations

```typescript
// For operations that must succeed or fail together
async transferStock(fromProductId: number, toProductId: number, quantity: number): Promise<void> {
  // Start transaction (to be implemented with oracledb)
  // const connection = await getConnection();
  // await connection.execute('BEGIN');

  try {
    const fromProduct = await this.repository.findById(fromProductId);
    const toProduct = await this.repository.findById(toProductId);

    if (!fromProduct || !toProduct) {
      throw new NotFoundError('One or both products not found');
    }

    if (fromProduct.stockQuantity < quantity) {
      throw new ValidationError('Insufficient stock');
    }

    await this.repository.update(fromProductId, {
      stockQuantity: fromProduct.stockQuantity - quantity
    });

    await this.repository.update(toProductId, {
      stockQuantity: toProduct.stockQuantity + quantity
    });

    // await connection.execute('COMMIT');
  } catch (error) {
    // await connection.execute('ROLLBACK');
    throw error;
  }
}
```

---

## Quick Reference

### File Checklist for New Feature

- [ ] `feature.model.ts` - Interfaces and DTOs
- [ ] `feature.repository.ts` - Database operations
- [ ] `feature.validation.ts` - Joi schemas
- [ ] `feature.service.ts` - Business logic
- [ ] `feature.controller.ts` - HTTP handlers with TSOA
- [ ] `feature.service.test.ts` - Unit tests
- [ ] `feature.validation.test.ts` - Validation tests

### Commands Cheat Sheet

```bash
npm run dev           # Start with hot reload
npm run build         # Production build
npm test              # Run tests
npm run test:ui       # Tests with UI
npm run tsoa:generate # Generate routes and Swagger
npm run format        # Format all files with Prettier
npm run format:check  # Check formatting (CI)
F5 in VS Code         # Debug with breakpoints
```

### Common Imports

```typescript
// Models and types
import { BaseModel, PaginatedResult, Filter } from '../../types';

// Errors
import { NotFoundError, ValidationError, ForbiddenError } from '../../core/middleware/error.middleware';

// Repository
import { BaseRepository } from '../../core/database/base-repository';

// Caching
import { getCache, setCache, deleteCache } from '../../core/cache/redis';

// Logging
import logger from '../../core/logger';

// Validation
import Joi from 'joi';

// TSOA
import { Controller, Get, Post, Put, Delete, Route, Tags, Path, Body, Query, Security } from 'tsoa';
```

---

## Getting Help

- **Architecture questions**: Ask team lead
- **TypeScript issues**: Check `tsconfig.json` settings
- **Database queries**: Review `base-repository.ts`
- **Validation syntax**: See Joi documentation
- **TSOA annotations**: Check existing controllers as examples
- **Debugging**: Use VS Code debugger (F5)

---

## Next Steps

1. Review the existing `users` feature as a complete example
2. Set up your development environment
3. Create a simple feature (following this guide)
4. Write tests for your feature
5. Generate Swagger documentation
6. Get code review from team

Welcome to the team! 🚀

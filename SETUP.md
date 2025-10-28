# Cairo Backend - Setup Guide

A modern Node.js RESTful API backend built with TypeScript, Express, and Oracle database.

## Features

- TypeScript with JavaScript interoperability
- Feature-based folder structure (not layer-based)
- Express.js with security middleware (Helmet, CORS)
- Oracle database with generic repository pattern
- Redis caching for API keys
- Dual authentication: SSO (SAML) and API Key
- Rate limiting by IP
- Winston logging
- Joi validation with strong typing
- Swagger documentation from decorators (tsoa)
- esbuild for fast builds and hot reload
- Vitest for testing
- Tanzu Application Service health endpoints

## Project Structure

```
cairo-backend/
├── src/
│   ├── config/                 # Environment configuration
│   ├── core/                   # Core functionality
│   │   ├── cache/              # Redis cache
│   │   ├── database/           # Database connection and base repository
│   │   ├── logger/             # Winston logger
│   │   └── middleware/         # Auth, rate limiting, error handling
│   ├── features/               # Feature modules
│   │   ├── health/             # Tanzu health check endpoints
│   │   └── users/              # Example user feature
│   │       ├── user.controller.ts
│   │       ├── user.service.ts
│   │       ├── user.repository.ts
│   │       ├── user.model.ts
│   │       ├── user.validation.ts
│   │       └── user.service.test.ts
│   ├── types/                  # TypeScript type definitions
│   └── server.ts               # Application entry point
├── .env.example                # Environment variables template
├── package.json
├── tsconfig.json
├── tsoa.json                   # Swagger/OpenAPI config
├── vitest.config.ts
└── esbuild.config.js
```

## Getting Started

### Prerequisites

- Node.js 18+
- Redis server
- Oracle database (setup to be completed)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file from template:

```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`

### Development

Run in development mode with hot reload:

```bash
npm run dev
```

### Generate Swagger Documentation

Generate Swagger spec and routes from tsoa decorators:

```bash
npm run tsoa:generate
```

This will create:
- `public/swagger.json` - OpenAPI specification
- `src/generated/routes.ts` - Express routes

After generating, uncomment the tsoa routes in `src/server.ts`:
- Line with `const swaggerDocument = require('../public/swagger.json');`
- Line with `app.use('/api-docs', ...)`
- Line with `RegisterRoutes(app);`

### Running Tests

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Production Build

```bash
npm run build
npm start
```

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DB_USER`, `DB_PASSWORD`, `DB_CONNECTION_STRING` - Oracle DB credentials
- `REDIS_HOST`, `REDIS_PORT` - Redis connection
- `CORS_ORIGIN` - Allowed CORS origins
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` - Rate limiting config

## Authentication

The API supports two authentication methods:

### 1. SSO Authentication (for UI)

Upstream SAML authentication provides an `identityid` header.

**Middleware:** `validateSSOAuth`

### 2. API Key Authentication (for external partners)

API keys are validated against Oracle database and cached in Redis.

**Header:** `x-api-key` (configurable)
**Middleware:** `validateApiKeyAuth`

## API Endpoints

### Health Check (Tanzu Actuator)

- `GET /actuator/health` - Basic health status
- `GET /actuator/health/liveness` - Detailed liveness check
- `GET /actuator/health/readiness` - Readiness check
- `GET /actuator/info` - Application info

### API Documentation

- `GET /api-docs` - Swagger UI (after generating tsoa routes)

### Example User Endpoints

- `GET /api/v1/users` - Get all users (paginated)
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/users` - Create new user
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

## Base Repository Pattern

The `BaseRepository<T>` class provides generic CRUD operations for any Oracle table:

- `findById(id)` - Find by ID
- `findAll(filters, pagination)` - Find all with filtering and pagination
- `create(model)` - Create new record
- `update(id, model)` - Update existing record
- `delete(id)` - Delete record

### Creating a New Repository

```typescript
import { BaseRepository } from '../../core/database/base-repository';
import { MyModel } from './my-model';

export class MyRepository extends BaseRepository<MyModel> {
  protected tableName = 'MY_TABLE';
  protected idColumn = 'ID';

  protected mapRowToModel(row: any): MyModel {
    return {
      id: row.ID,
      name: row.NAME,
      // ... map other fields
    };
  }

  protected mapModelToRow(model: Partial<MyModel>): any {
    return {
      NAME: model.name,
      // ... map other fields
    };
  }
}
```

## Creating a New Feature

Each feature should be self-contained in its own folder:

1. Create folder: `src/features/my-feature/`
2. Add files:
   - `my-feature.model.ts` - TypeScript interfaces
   - `my-feature.validation.ts` - Joi schemas
   - `my-feature.repository.ts` - Database access
   - `my-feature.service.ts` - Business logic
   - `my-feature.controller.ts` - API endpoints (tsoa decorators)
   - `my-feature.service.test.ts` - Tests

## Oracle Database Setup

**TODO:** You need to complete the OracleDB implementation:

1. Install oracledb package
2. Update `src/core/database/connection.ts` with actual Oracle connection
3. Uncomment OracleDB code in repository methods
4. Test database connectivity

## Tanzu Deployment

When deploying to Tanzu Application Service:

- Remove `.env` file (use TAS secure key store instead)
- Set environment variables via TAS configuration
- Health endpoints are configured for platform monitoring
- Graceful shutdown handlers are implemented

## Testing

Example test structure using Vitest:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('MyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', async () => {
    // Test implementation
  });
});
```

## Error Handling

All errors return consistent RESTful responses:

```json
{
  "statusCode": 400,
  "message": "Error message",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/endpoint",
  "errors": [] // Optional validation errors
}
```

## Rate Limiting

- API endpoints: 100 requests per 15 minutes per IP
- Authentication endpoints: 5 requests per 15 minutes per IP
- Health endpoints: Not rate limited

## Next Steps

1. Install dependencies: `npm install`
2. Set up Redis server locally
3. Create `.env` file with your configuration
4. Run development server: `npm run dev`
5. Test health endpoint: http://localhost:3000/actuator/health
6. When ready, set up Oracle DB and uncomment stubs
7. Generate Swagger docs: `npm run tsoa:generate`
8. Run tests: `npm test`

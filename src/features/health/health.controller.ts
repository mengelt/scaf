import { Controller, Get, Route, Tags } from 'tsoa';
import { HealthService } from './health.service';

interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

interface DetailedHealthResponse extends HealthResponse {
  checks: {
    database: {
      status: string;
      message?: string;
    };
    redis: {
      status: string;
      message?: string;
    };
  };
}

interface InfoResponse {
  app: {
    name: string;
    version: string;
    environment: string;
  };
  build: {
    timestamp: string;
  };
}

/**
 * Health check endpoints for Tanzu Application Service monitoring
 */
@Route('actuator')
@Tags('Health')
export class HealthController extends Controller {
  private healthService: HealthService;

  constructor() {
    super();
    this.healthService = new HealthService();
  }

  /**
   * Basic health check endpoint
   * Returns simple UP/DOWN status
   */
  @Get('health')
  public async getHealth(): Promise<HealthResponse> {
    return this.healthService.getBasicHealth();
  }

  /**
   * Detailed health check endpoint
   * Returns health status with component checks (database, cache, etc.)
   */
  @Get('health/liveness')
  public async getLiveness(): Promise<DetailedHealthResponse> {
    return this.healthService.getDetailedHealth();
  }

  /**
   * Readiness check endpoint
   * Checks if the application is ready to accept traffic
   */
  @Get('health/readiness')
  public async getReadiness(): Promise<DetailedHealthResponse> {
    return this.healthService.getReadinessHealth();
  }

  /**
   * Application info endpoint
   * Returns application metadata
   */
  @Get('info')
  public async getInfo(): Promise<InfoResponse> {
    return this.healthService.getInfo();
  }
}

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * Health Check Controller
 *
 * Endpoints pour vérifier la santé de l'application :
 * - /health - Check global
 * - /health/db - Check base de données
 * - /health/memory - Check mémoire
 * - /health/disk - Check espace disque
 *
 * Utilisé par :
 * - Load balancers
 * - Monitoring tools (Datadog, New Relic)
 * - Kubernetes liveness/readiness probes
 */
@ApiTags('health')
@Controller('health')
@SkipThrottle() // Pas de rate limiting sur health checks
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check de santé global' })
  check() {
    return this.health.check([
      // Check de la base de données
      () => this.db.pingCheck('database'),

      // Check de la mémoire (heap ne doit pas dépasser 300MB)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),

      // Check de la mémoire RSS
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),

      // Check de l'espace disque (doit avoir au moins 10GB libre)
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9, // 90%
        }),
    ]);
  }

  @Get('db')
  @HealthCheck()
  @ApiOperation({ summary: 'Check de la base de données' })
  checkDatabase() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 300 }),
    ]);
  }

  @Get('memory')
  @HealthCheck()
  @ApiOperation({ summary: 'Check de la mémoire' })
  checkMemory() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
    ]);
  }

  @Get('disk')
  @HealthCheck()
  @ApiOperation({ summary: "Check de l'espace disque" })
  checkDisk() {
    return this.health.check([
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Kubernetes liveness probe' })
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('readiness')
  @HealthCheck()
  @ApiOperation({ summary: 'Kubernetes readiness probe' })
  readiness() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import * as os from 'os';
import * as process from 'process';

/**
 * Metrics Controller
 *
 * Expose des métriques système pour monitoring :
 * - Utilisation CPU
 * - Utilisation mémoire
 * - Uptime
 * - Version Node.js
 * - Informations système
 */
@ApiTags('metrics')
@Controller('metrics')
@SkipThrottle()
export class MetricsController {
  private startTime = Date.now();

  @Get()
  @ApiOperation({ summary: 'Métriques système' })
  getMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpus = os.cpus();

    return {
      timestamp: new Date().toISOString(),
      uptime: {
        process: Math.floor((Date.now() - this.startTime) / 1000),
        system: os.uptime(),
      },
      memory: {
        used: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
        },
        free: `${Math.round(os.freemem() / 1024 / 1024)}MB`,
        total: `${Math.round(os.totalmem() / 1024 / 1024)}MB`,
        percentUsed: Math.round(
          ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
        ),
      },
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model || 'unknown',
        loadAverage: os.loadavg(),
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        nodeVersion: process.version,
      },
      env: process.env.NODE_ENV || 'development',
    };
  }

  @Get('simple')
  @ApiOperation({ summary: 'Métriques simplifiées pour Prometheus' })
  getSimpleMetrics() {
    const memoryUsage = process.memoryUsage();

    return {
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      memory_heap_used_bytes: memoryUsage.heapUsed,
      memory_heap_total_bytes: memoryUsage.heapTotal,
      memory_rss_bytes: memoryUsage.rss,
      memory_external_bytes: memoryUsage.external,
      cpu_count: os.cpus().length,
      load_average_1m: os.loadavg()[0],
      load_average_5m: os.loadavg()[1],
      load_average_15m: os.loadavg()[2],
    };
  }
}

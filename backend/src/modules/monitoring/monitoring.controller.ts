import { Controller, Get, Post, Body, HttpCode } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { AlertService } from './alert.service';
import { CacheService } from '../../common/cache/cache.service';

@Controller()
export class MonitoringController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly alertService: AlertService,
    private readonly cacheService: CacheService,
  ) {}

  @Get('metrics')
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  @Get('cache/stats')
  getCacheStats() {
    return this.cacheService.getStats();
  }

  @Post('api/alerts/webhook')
  @HttpCode(200)
  async handleAlert(@Body() alert: any) {
    await this.alertService.handleAlert(alert);
    return { status: 'received' };
  }
}

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsMiddleware } from './metrics.middleware';
import { MonitoringController } from './monitoring.controller';
import { AlertService } from './alert.service';
import { StructuredLoggerService } from './structured-logger.service';
import { WebhookSignatureService } from '../webhooks/webhook-signature.service';
import { WebhookSignatureGuard } from '../webhooks/guards/webhook-signature.guard';

@Module({
  controllers: [MonitoringController],
  providers: [
    MetricsService,
    AlertService,
    StructuredLoggerService,
    WebhookSignatureService,
    WebhookSignatureGuard,
  ],
  exports: [MetricsService, StructuredLoggerService],
})
export class MonitoringModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}

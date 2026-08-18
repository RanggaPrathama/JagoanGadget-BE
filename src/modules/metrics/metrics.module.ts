import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsInterceptor } from './metrics.interceptor';
import { metricsProviders } from './metrics.providers';
import { PublicMetricsController } from './metrics.controller';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      controller: PublicMetricsController,
      defaultMetrics: {
        enabled: true,
        config: {},
      },
    }),
  ],
  providers: [
    ...metricsProviders,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [PrometheusModule],
})
export class MetricsModule {}

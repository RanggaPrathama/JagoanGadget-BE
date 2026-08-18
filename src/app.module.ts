import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { AppController } from './app.controller';
import { PermissionGuard } from '@common/guards/permission.guard';
import configuration from '@config/configuration';
import { envValidationSchema } from '@config/env.validation';
import { DatabaseModule } from '@database/database.module';
import { auth } from '@lib/auth';
import { UsersModule } from '@module/users/users.module';
import { UploadsModule } from '@module/uploads/uploads.module';
import { AccessControlModule } from '@module/access-control/access-control.module';
import { RedisModule } from '@module/redis/redis.module';
import { StorageModule } from '@module/storage/storage.module';
import { MetricsModule } from '@module/metrics/metrics.module';
import { MasterModule } from '@module/master/master.module';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('NODE_ENV') === 'production';
        const logLevel =
          config.get('LOG_LEVEL') ?? (isProduction ? 'info' : 'debug');

        return {
          pinoHttp: {
            level: logLevel,
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l',
                    ignore: 'pid,hostname',
                    customColors: {
                      60: 'red', // fatal
                      50: 'red', // error
                      40: 'yellow', // warn
                      30: 'green', // info
                      20: 'cyan', // debug
                      10: 'gray', // trace
                    },
                  },
                },
            genReqId: () => randomUUID(),
            customLogLevel: (_req, res, error) => {
              if (error || res.statusCode >= 500) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },
            customSuccessMessage: (_req, _res, responseTime) =>
              `request completed - ${responseTime}ms`,
            customErrorMessage: (_req, _res, error) =>
              `request error - ${error.message}`,
            customAttributeKeys: { reqId: 'requestId' },
            customProps: () => ({ context: 'HTTP' }),
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.passwordConfirm',
                'req.body.secret',
                'req.body.token',
              ],
              censor: '[REDACTED]',
            },
            autoLogging: {
              ignore: (req) =>
                req.url === '/api/health' || req.url === '/metrics',
            },
          },
        };
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    DatabaseModule,
    ScheduleModule.forRoot(),
    AuthModule.forRoot({
      auth,
      bodyParser: {
        json: { enabled: true },
        urlencoded: { enabled: true, extended: true },
      },
    }),
    UsersModule,
    AccessControlModule,
    RedisModule,
    StorageModule,
    UploadsModule,
    ...(process.env.METRICS_ENABLED === 'true' ? [MetricsModule] : []),
    MasterModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule {}

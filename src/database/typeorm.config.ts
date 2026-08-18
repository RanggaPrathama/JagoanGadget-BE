import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.getOrThrow<string>('database.host'),
  port: configService.getOrThrow<number>('database.port'),
  username: configService.getOrThrow<string>('database.username'),
  password: configService.getOrThrow<string>('database.password'),
  database: configService.getOrThrow<string>('database.name'),
  ssl: configService.get<boolean>('database.ssl')
    ? { rejectUnauthorized: false }
    : false,
  autoLoadEntities: true,
  synchronize: configService.get<boolean>('database.synchronize', false),
  logging: configService.get<boolean>('database.logging', false),
  retryAttempts: 3,
  toRetry: (err) => err.name === 'QueryFailedError',
  extra: {
    connectTimeoutMS: 5000,
  },
});

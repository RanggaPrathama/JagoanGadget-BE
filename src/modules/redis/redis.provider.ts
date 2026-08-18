import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Redis => {
    const logger = new Logger('RedisProvider');
    const host = config.get<string>('redis.host')!;
    const port = config.get<number>('redis.port')!;
    const password = config.get<string>('redis.password');
    const db = config.get<number>('redis.db')!;
    const keyPrefix = config.get<string>('redis.keyPrefix')!;

    const redis = new Redis({
      host,
      port,
      password: password || undefined,
      db,
      keyPrefix: keyPrefix + ':',
      retryStrategy: (times) => {
        if (times > 10) return null;
        return Math.min(times * 200, 3000);
      },
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
    });

    redis.on('error', (err) => {
      logger.error('[Redis] Connection error:', err.message);
    });

    redis.on('connect', () => {
      logger.log('[Redis] Connected');
    });

    return redis;
  },
};

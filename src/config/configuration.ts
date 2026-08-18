import { toBoolean, toNumber, toOrigin } from '@common/helpers/cast.helper';

export type AppConfig = {
  app: {
    name: string;
    environment: string;
    port: number;
    baseUrl: string;
    corsOrigin: string;
    logging: {
      enabled: boolean;
      logLevel: string;
    };
  };
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
    ssl: boolean;
    logging: boolean;
    synchronize: boolean;
  };
  auth: {
    secret: string;
    url: string;
    apiKey?: string;
    apiUrl?: string;
    kvUrl?: string;
    basePath: string;
    trustedOrigins: string[];
    dashEnabled: boolean;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
  };
  storage: {
    driver?: string;
    localPath?: string;
    tempTtlHours: number;
    /** Full URL prefix for public files; falls back to `${app.baseUrl}/api/storage`. */
    publicUrl?: string;
    /** Default file URL (e.g. avatar) for missing/null values; falls back to `${app.baseUrl}/image/default-user.png`. */
    defaultAvatar?: string;
  };
  metrics: {
    enabled: boolean;
    port: number;
  };
};

export default (): AppConfig => {
  const isDevelopment =
    (process.env.NODE_ENV ?? 'development') === 'development';
  const authUrl = process.env.BETTER_AUTH_URL ?? process.env.APP_BASE_URL ?? '';
  const authOrigin = toOrigin(authUrl);
  const trustedOrigins = [
    ...(authOrigin ? [authOrigin] : []),
    ...(process.env.APP_CORS_ORIGIN ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .filter((origin) => origin !== '*'),
  ].filter(Boolean);

  return {
    app: {
      name: process.env.APP_NAME ?? 'NestJS API',
      environment: process.env.NODE_ENV ?? 'development',
      port: toNumber(process.env.PORT, 3000),
      baseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
      corsOrigin: process.env.APP_CORS_ORIGIN ?? '*',
      logging: {
        enabled: toBoolean(process.env.APP_LOGGING_ENABLED, isDevelopment),
        logLevel: process.env.LOG_LEVEL ?? (isDevelopment ? 'debug' : 'info'),
      },
    },
    database: {
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: toNumber(process.env.DATABASE_PORT, 5432),
      username: process.env.DATABASE_USERNAME ?? 'postgres',
      password: process.env.DATABASE_PASSWORD ?? '',
      name: process.env.DATABASE_NAME ?? 'app_db',
      ssl: toBoolean(process.env.DATABASE_SSL),
      logging: toBoolean(process.env.DATABASE_LOGGING),
      synchronize: toBoolean(process.env.DATABASE_SYNCHRONIZE, isDevelopment),
    },
    auth: {
      secret: process.env.BETTER_AUTH_SECRET ?? '',
      url: authUrl,
      apiKey: process.env.BETTER_AUTH_API_KEY?.trim() || undefined,
      apiUrl: process.env.BETTER_AUTH_API_URL?.trim() || undefined,
      kvUrl: process.env.BETTER_AUTH_KV_URL?.trim() || undefined,
      basePath: '/api/auth',
      trustedOrigins: [...new Set(trustedOrigins)],
      dashEnabled:
        Boolean(process.env.BETTER_AUTH_API_KEY?.trim()) &&
        !authUrl.includes('localhost'),
    },
    redis: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: toNumber(process.env.REDIS_PORT, 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      db: toNumber(process.env.REDIS_DB, 0),
      keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'app:rbac',
    },
    storage: {
      driver: process.env.STORAGE_DRIVER?.trim() || undefined,
      localPath: process.env.STORAGE_LOCAL_PATH?.trim() || undefined,
      tempTtlHours: toNumber(process.env.STORAGE_TEMP_TTL_HOURS, 24),
      publicUrl: process.env.STORAGE_PUBLIC_URL?.trim() || undefined,
      defaultAvatar: process.env.STORAGE_DEFAULT_AVATAR?.trim() || undefined,
    },
    metrics: {
      enabled: toBoolean(process.env.METRICS_ENABLED),
      port: toNumber(process.env.METRICS_PORT, 3000),
    },
  };
};

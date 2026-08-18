import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  APP_NAME: Joi.string().trim().default('NestJS API'),
  APP_BASE_URL: Joi.string().uri().required(),
  APP_CORS_ORIGIN: Joi.string().trim().default('*'),
  DATABASE_HOST: Joi.string().trim().required(),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_USERNAME: Joi.string().trim().required(),
  DATABASE_PASSWORD: Joi.string().allow('').required(),
  DATABASE_NAME: Joi.string().trim().required(),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_LOGGING: Joi.boolean().default(false),
  DATABASE_SYNCHRONIZE: Joi.boolean().default(false),
  BETTER_AUTH_SECRET: Joi.string().min(32).required(),
  BETTER_AUTH_API_KEY: Joi.string().trim().optional(),
  BETTER_AUTH_API_URL: Joi.string().uri().optional(),
  BETTER_AUTH_KV_URL: Joi.string().uri().optional(),
  STORAGE_DRIVER: Joi.string().trim().optional(),
  STORAGE_LOCAL_PATH: Joi.string().trim().optional(),
  STORAGE_TEMP_TTL_HOURS: Joi.number().min(1).default(24),
  STORAGE_PUBLIC_URL: Joi.string().uri().optional(),
  STORAGE_DEFAULT_AVATAR: Joi.string().trim().optional(),
  REDIS_HOST: Joi.string().trim().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().min(0).max(15).default(0),
  REDIS_KEY_PREFIX: Joi.string().trim().default('app:rbac'),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
    .optional(),
  METRICS_ENABLED: Joi.boolean().default(false),
});

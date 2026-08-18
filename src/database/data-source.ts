import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { toBoolean } from '@common/helpers/cast.helper';

dotenv.config();

const isDevelopment = (process.env.NODE_ENV ?? 'development') === 'development';

const config: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number.parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USERNAME ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? '',
  database: process.env.DATABASE_NAME ?? 'app_db',
  ssl: toBoolean(process.env.DATABASE_SSL)
    ? { rejectUnauthorized: false }
    : false,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: toBoolean(process.env.DATABASE_SYNCHRONIZE) || isDevelopment,
};

export default new DataSource(config);

import 'dotenv/config';
import {
  toBoolean,
  toOrigin,
  unique,
  isPublicOrigin,
  parseOrigins,
} from '../common/helpers/cast.helper';

export type BetterAuthConfig = {
  url: string;
  secret: string;
  apiKey?: string;
  apiUrl?: string;
  kvUrl?: string;
  basePath: '/api/auth';
  trustedOrigins: string[];
  useSecureCookies: boolean;
};

export const getBetterAuthConfig = (): BetterAuthConfig => {
  const url =
    process.env.BETTER_AUTH_API_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    '';
  const apiKey = process.env.BETTER_AUTH_API_KEY?.trim() || undefined;
  const apiUrl = process.env.BETTER_AUTH_API_URL?.trim() || undefined;
  const kvUrl = process.env.BETTER_AUTH_KV_URL?.trim() || undefined;
  const authOrigin = toOrigin(url);
  const trustedOrigins = unique([
    ...(authOrigin ? [authOrigin] : []),
    ...parseOrigins(process.env.APP_CORS_ORIGIN),
  ]);

  return {
    url,
    secret: process.env.BETTER_AUTH_SECRET ?? '',
    apiKey,
    apiUrl,
    kvUrl,
    basePath: '/api/auth',
    trustedOrigins,
    useSecureCookies: isPublicOrigin(url),
  };
};

export const getBetterAuthPoolConfig = () => ({
  host: process.env.DATABASE_HOST,
  port: Number.parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl: toBoolean(process.env.DATABASE_SSL)
    ? { rejectUnauthorized: false }
    : undefined,
  connectionTimeoutMillis: 5000,
});

import { Pool, PoolConfig } from 'pg';
import { betterAuth } from 'better-auth';
import { dash } from '@better-auth/infra';
import { openAPI } from 'better-auth/plugins';
import {
  getBetterAuthConfig,
  getBetterAuthPoolConfig,
} from '../config/auth.config';
import { isPublicOrigin } from '@common/helpers/cast.helper';

const authConfig = getBetterAuthConfig();
const useCrossSiteCookies = isPublicOrigin(authConfig.url);

const plugins = [
  dash({
    apiKey: authConfig.apiKey as string,
    // apiUrl: authConfig.apiUrl,
    // kvUrl: authConfig.kvUrl,
    activityTracking: {
      enabled: true,
      updateInterval: 300000, // Update interval in ms (default: 5 minutes)
    },
  }),
  openAPI(),
];

export const auth = betterAuth({
  secret: authConfig.secret,
  baseURL: authConfig.url,
  basePath: authConfig.basePath,
  database: new Pool(getBetterAuthPoolConfig() as PoolConfig),
  trustedOrigins: authConfig.trustedOrigins,
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
  },
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: useCrossSiteCookies ? 'none' : 'lax',
      secure: useCrossSiteCookies,
      httpOnly: true,
    },
    useSecureCookies: authConfig.useSecureCookies,
  },
  plugins,
  hooks: {},
  databaseHooks: {},
}) as ReturnType<typeof betterAuth>;

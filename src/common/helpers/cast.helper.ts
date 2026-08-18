const TRUTHY_VALUES = new Set(['true', '1', 'yes', 'on']);

/**
 * Parse string env value to boolean.
 * Supports: 'true', '1', 'yes', 'on' (case-insensitive)
 */
export const toBoolean = (
  value: string | undefined,
  fallback = false,
): boolean => {
  if (value === undefined) return fallback;
  return TRUTHY_VALUES.has(value.toLowerCase());
};

/**
 * Parse string env value to number, with fallback if NaN.
 */
export const toNumber = (
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

/**
 * Extract origin (protocol + hostname + port) from a URL string.
 * Returns null if URL is invalid.
 */
export const toOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

/**
 * Deduplicate array values.
 */
export const unique = <T>(values: T[]): T[] => [...new Set(values)];

/**
 * Check if a URL is a public (non-local) https origin.
 */
export const isPublicOrigin = (value: string): boolean => {
  const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !LOCAL_HOSTS.has(url.hostname) &&
      !url.hostname.endsWith('.local')
    );
  } catch {
    return false;
  }
};

/**
 * Parse comma-separated origin list, filtering out wildcard and empties.
 */
export const parseOrigins = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .filter((origin) => origin !== '*');

/**
 * Resolve APP_CORS_ORIGIN to `true` (allow all) or a list of origins.
 */
export const resolveCorsOrigin = (
  value: string | undefined,
): true | string[] => {
  const normalized = value?.trim();

  if (!normalized || normalized === '*') return true;

  return normalized
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

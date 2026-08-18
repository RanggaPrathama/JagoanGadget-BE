/**
 * Helpers to toggle between storage-relative keys (`public/users/avatars/x.png`)
 * and fully-qualified URLs (`{storagePrefix}/public/users/avatars/x.png`).
 * The DB stores relative keys; the host prefix is applied at read time
 * (see StorageUrlSubscriber) so switching storage backends (local → S3/MinIO)
 * is just an env change, no data migration.
 */

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

/**
 * True if the value is an external absolute URL (`https://...`),
 * which must never be prefixed.
 */
export const isAbsoluteUrl = (value: string): boolean =>
  ABSOLUTE_URL_REGEX.test(value);

/**
 * Type guard: true only for non-null relative storage keys
 * (e.g. `public/users/avatars/x.png`). Absolute URLs, `/`-leading
 * paths and empty strings are not treated as relative keys.
 */
export const isRelativeStorageKey = (
  value: string | null | undefined,
): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  !value.startsWith('/') &&
  !isAbsoluteUrl(value);

/**
 * Prefix a relative storage key with the configured storage base URL.
 * Idempotent for absolute URLs (returned unchanged).
 */
export const prefixStorageUrl = (
  key: string,
  storagePrefix: string,
): string => {
  if (isAbsoluteUrl(key)) return key;
  const prefix = storagePrefix.replace(/\/+$/, '');
  return `${prefix}/${key}`;
};

/**
 * Strip the configured storage base URL from a value, returning the
 * storage-relative key. Values that do not start with the prefix
 * (external URLs, already-relative keys, null) are returned unchanged.
 * Idempotent — safe to run before every insert/update.
 */
export const stripStoragePrefix = (
  value: string | null,
  storagePrefix: string,
): string | null => {
  if (typeof value !== 'string' || isAbsoluteUrl(value)) return value;
  const prefix = storagePrefix.replace(/\/+$/, '');
  if (value.startsWith(`${prefix}/`)) {
    return value.slice(prefix.length + 1);
  }
  return value;
};

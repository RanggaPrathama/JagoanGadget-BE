import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import type { AppConfig } from '@config/configuration';
import {
  isRelativeStorageKey,
  prefixStorageUrl,
  stripStoragePrefix,
} from '../../common/helpers/storage-url.helper';
import { getStorageUrlColumns } from '@common/decorators/storage-url.decorator';

/**
 * Keeps storage-key columns relative in the DB while returning fully-qualified
 * URLs to clients. Columns opt in via the `@StorageUrl()` decorator (registry
 * read via reflect-metadata), so this subscriber is generic — no per-entity
 * hardcoding.
 * - `afterLoad`  → prefix the configured storage base URL onto relative keys;
 *   `null`/empty with a `defaultConfigKey` → that configured default image.
 * - `beforeInsert`/`beforeUpdate` → strip the prefix back off for storage in the DB
 *   (a default URL is written back as `null`).
 */
@Injectable()
@EventSubscriber()
export class StorageUrlSubscriber implements EntitySubscriberInterface {
  private readonly storagePrefix: string;
  private readonly baseUrl: string;
  private readonly storage: AppConfig['storage'] | undefined;

  constructor(dataSource: DataSource, configService: ConfigService<AppConfig>) {
    const storage = configService.get<AppConfig['storage']>('storage');
    const app = configService.get<AppConfig['app']>('app');
    this.baseUrl = app?.baseUrl ?? 'http://localhost:3000';

    this.storagePrefix = (
      storage?.publicUrl ?? `${this.baseUrl}/api/storage`
    ).replace(/\/+$/, '');

    this.storage = storage;

    dataSource.subscribers.push(this);
  }

  /** Listen to every entity; per-column work is filtered by the @StorageUrl registry. */
  listenTo(): typeof Object {
    return Object;
  }

  afterLoad(entity: any): void {
    for (const { property, defaultConfigKey } of getStorageUrlColumns(
      entity.constructor,
    )) {
      const value = entity[property];
      if (isRelativeStorageKey(value)) {
        entity[property] = prefixStorageUrl(value, this.storagePrefix);
        continue;
      }
      // Absolute URL (legacy full URL or external) — leave untouched.
      if (value) continue;
      // null / empty → default image only when one is configured.
      if (defaultConfigKey) {
        entity[property] = this.resolveDefault(
          this.storage?.[defaultConfigKey as keyof typeof this.storage] as
            | string
            | undefined,
        );
      }
    }
  }

  beforeInsert(event: InsertEvent<any>): void {
    this.normalizeAll(event.entity);
  }

  beforeUpdate(event: UpdateEvent<any>): void {
    if (event.entity) this.normalizeAll(event.entity);
  }

  /**
   * Reduce client-facing values back to their DB form: a default URL → null,
   * storage-prefixed → relative key, external → as-is. Columns without a
   * `defaultConfigKey` never get a default substituted.
   */
  private normalizeAll(entity: any): void {
    for (const { property, defaultConfigKey } of getStorageUrlColumns(
      entity.constructor,
    )) {
      const value = entity[property];
      if (typeof value !== 'string') continue;
      const def = defaultConfigKey
        ? this.resolveDefault(
            this.storage?.[defaultConfigKey as keyof typeof this.storage] as
              | string
              | undefined,
          )
        : null;
      entity[property] =
        def && value === def
          ? null
          : stripStoragePrefix(value, this.storagePrefix);
    }
  }

  private resolveDefault(configured?: string): string {
    const path = configured?.trim() || '/image/default-user.png';
    if (/^https?:\/\//i.test(path)) return path;
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }
}

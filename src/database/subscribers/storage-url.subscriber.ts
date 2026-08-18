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
import { UserEntity } from '@module/users/entities/user.entity';
import {
  isRelativeStorageKey,
  prefixStorageUrl,
  stripStoragePrefix,
} from '../../common/helpers/storage-url.helper';

/**
 * Keeps `avatar_url` (and future storage-key columns) relative in the DB while
 * returning a fully-qualified URL to clients.
 * - `afterLoad`  → prefix the configured storage base URL onto relative keys;
 *   `null`/empty → default avatar (static asset under `public/`).
 * - `beforeInsert`/`beforeUpdate` → strip the prefix back off for storage in the DB.
 */
@Injectable()
@EventSubscriber()
export class StorageUrlSubscriber implements EntitySubscriberInterface<UserEntity> {
  private readonly storagePrefix: string;
  private readonly defaultAvatarUrl: string;

  constructor(dataSource: DataSource, configService: ConfigService<AppConfig>) {
    const storage = configService.get<AppConfig['storage']>('storage');
    const app = configService.get<AppConfig['app']>('app');
    const baseUrl = app?.baseUrl ?? 'http://localhost:3000';

    this.storagePrefix = (
      storage?.publicUrl ?? `${baseUrl}/api/storage`
    ).replace(/\/+$/, '');

    this.defaultAvatarUrl = this.resolveDefaultAvatar(
      baseUrl,
      storage?.defaultAvatar,
    );

    dataSource.subscribers.push(this);
  }

  listenTo(): typeof UserEntity {
    return UserEntity;
  }

  afterLoad(entity: UserEntity): void {
    if (isRelativeStorageKey(entity.avatarUrl)) {
      entity.avatarUrl = prefixStorageUrl(entity.avatarUrl, this.storagePrefix);
      return;
    }
    // Absolute URL (legacy full URL or external) — leave untouched.
    if (entity.avatarUrl) return;
    // null / empty → default avatar.
    entity.avatarUrl = this.defaultAvatarUrl;
  }

  beforeInsert(event: InsertEvent<UserEntity>): void {
    event.entity.avatarUrl = this.normalizeForWrite(event.entity.avatarUrl);
  }

  beforeUpdate(event: UpdateEvent<UserEntity>): void {
    const entity = event.entity;
    if (entity && typeof entity.avatarUrl === 'string') {
      entity.avatarUrl = this.normalizeForWrite(entity.avatarUrl);
    }
  }

  /**
   * Reduce a client-facing value back to its DB form:
   * default URL → null, storage-prefixed → relative key, external → as-is.
   */
  private normalizeForWrite(value: string | null): string | null {
    if (typeof value !== 'string') return value;
    if (value === this.defaultAvatarUrl) return null;
    return stripStoragePrefix(value, this.storagePrefix);
  }

  private resolveDefaultAvatar(
    baseUrl: string,
    configured: string | undefined,
  ): string {
    const path = configured?.trim() || '/image/default-user.png';
    if (/^https?:\/\//i.test(path)) return path;
    return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }
}

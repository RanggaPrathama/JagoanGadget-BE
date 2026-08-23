import 'reflect-metadata';

const STORAGE_URL_REGISTRY = 'storage:url:registry';

export interface StorageUrlOptions {
  /**
   * Key pada `AppConfig['storage']` yang menghasilkan default URL saat kolom
   * null/kosong. Avatar → `'defaultAvatar'`. Dibiarkan kosong untuk kolom yang
   * tidak ingin default (mis. brand logo → null).
   */
  defaultConfigKey?: string;
}

export interface StorageUrlColumn {
  property: string;
  defaultConfigKey?: string;
}

/**
 * Marks an entity column as a "storage URL" so the StorageUrlSubscriber can
 * keep it relative in the DB and absolute in API responses, optionally falling
 * back to a configured default image. Registration is via reflect-metadata so
 * the subscriber stays generic (no per-entity hardcoding).
 */
export function StorageUrl(options: StorageUrlOptions = {}): PropertyDecorator {
  return (target, propertyKey) => {
    const ctor = target.constructor;
    const list: StorageUrlColumn[] =
      Reflect.getMetadata(STORAGE_URL_REGISTRY, ctor) ?? [];
    list.push({ property: propertyKey as string, ...options });
    Reflect.defineMetadata(STORAGE_URL_REGISTRY, list, ctor);
  };
}

export const getStorageUrlColumns = (
  ctor: new (...args: any[]) => object,
): StorageUrlColumn[] => Reflect.getMetadata(STORAGE_URL_REGISTRY, ctor) ?? [];

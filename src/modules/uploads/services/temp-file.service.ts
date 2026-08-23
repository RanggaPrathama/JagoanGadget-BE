import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { readdir, stat, unlink } from 'node:fs/promises';
import { extname, join } from 'node:path';
import type { AppConfig } from '@config/configuration';
import type { StorageProvider } from '../../storage/interfaces/storage.interface';
import { StorageFileService } from '../../storage/services/storage-file.service';
import { TEMP_KEY_REGEX, UPLOAD_PURPOSE_CONFIG } from '../uploads.constants';

@Injectable()
export class TempFileService implements OnModuleInit {
  private readonly logger = new Logger(TempFileService.name);
  private readonly storageRoot: string;
  private readonly tempTtlHours: number;

  constructor(
    @Inject('STORAGE_PROVIDER')
    private readonly storageProvider: StorageProvider,
    private readonly configService: ConfigService<AppConfig>,
    private readonly storageFileService: StorageFileService,
  ) {
    this.storageRoot =
      this.configService.get<AppConfig['storage']>('storage')?.localPath ??
      './storage';
    this.tempTtlHours =
      this.configService.get<AppConfig['storage']>('storage')?.tempTtlHours ??
      24;
  }

  /**
   * Emit a heartbeat at boot so operators can confirm the hourly temp-cleanup
   * scheduler is registered and running. Routed through the app's Pino logger.
   */
  onModuleInit(): void {
    this.logger.log(
      `Temp sweep scheduler ACTIVE | interval: 1h, TTL: ${this.tempTtlHours}h, root: ${join(this.storageRoot, 'temp')}`,
    );
  }

  /**
   * Move a staged temp file (`temp/{purpose}/{file}`) to its configured final
   * public folder (`public/{finalFolder}/{newUuid}{ext}`), using the purpose
   * declared in UPLOAD_PURPOSE_CONFIG. The old public file of this purpose is
   * NOT handled here — callers (features) decide what to keep/delete.
   *
   * Returns the new URL. Throws NotFound on a duplicate/nonexistent temp key.
   */
  async promote(tempKey: string): Promise<string> {
    const purpose = this.purposeFromKey(tempKey);
    if (!purpose) {
      throw new NotFoundException(`Invalid temp file key: ${tempKey}`);
    }

    const config = UPLOAD_PURPOSE_CONFIG[purpose];
    const ext = extname(tempKey);
    const newFilename = `${randomUUID()}${ext}`;

    const rootFolder = config.visibility === 'private' ? 'private' : 'public';

    const finalKey = `${rootFolder}/${config.finalFolder}/${newFilename}`;

    await this.storageProvider.move(tempKey, finalKey);

    // save key to db
    return finalKey;
  }

  /**
   * Best-effort delete of a previously stored public file (e.g. old-file cleanup).
   */
  async deleteByRelativePath(relativePath: string): Promise<void> {
    try {
      await this.storageProvider.delete(relativePath);
    } catch (error: unknown) {
      this.logger.warn(`Old file cleanup failed for ${relativePath}: ${error}`);
    }
  }

  /**
   * Convert a stored public URL back to its storage-relative path
   * (e.g. `.../api/storage/public/users/avatars/x.png` →
   * `public/users/avatars/x.png`). Used by features to locate an old file
   * for cleanup. Passthrough to StorageFileService.
   */
  urlToRelativePath(url: string): string {
    return this.storageFileService.urlToRelativePath(url);
  }

  /**
   * Sweep stale temp files. Runs hourly; deletes files under storage/temp
   * whose mtime is older than the configured TTL.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sweep(): Promise<void> {
    const tempRoot = join(this.storageRoot, 'temp');
    let cleaned = 0;

    const cutoff = Date.now() - this.tempTtlHours * 3600 * 1000;

    try {
      const purposes = await readdir(tempRoot, { withFileTypes: true });
      for (const purpose of purposes) {
        if (!purpose.isDirectory()) continue;
        const purposeDir = join(tempRoot, purpose.name);
        const files = await readdir(purposeDir);
        for (const file of files) {
          const filePath = join(purposeDir, file);
          try {
            const info = await stat(filePath);
            if (info.isFile() && info.mtimeMs < cutoff) {
              await unlink(filePath);
              cleaned++;
            }
          } catch (error: unknown) {
            if (isNodeError(error) && error.code === 'ENOENT') continue;
            this.logger.warn(`Temp sweep error on ${filePath}: ${error}`);
          }
        }
      }
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        // No temp dir yet — nothing to sweep.
        return;
      }
      this.logger.error(`Temp sweep failed: ${error}`);
      return;
    }

    if (cleaned > 0) {
      this.logger.log(`Temp sweep cleaned ${cleaned} stale file(s)`);
    }
  }

  /** Derive the purpose (and validate the key shape) from `temp/{purpose}/...`. */
  private purposeFromKey(
    tempKey: string,
  ): keyof typeof UPLOAD_PURPOSE_CONFIG | null {
    if (!TEMP_KEY_REGEX.test(tempKey)) return null;
    const purpose = tempKey.split('/')[1] as keyof typeof UPLOAD_PURPOSE_CONFIG;
    return purpose in UPLOAD_PURPOSE_CONFIG ? purpose : null;
  }

  private baseUrl(): string {
    return (
      this.configService.get<AppConfig['app']>('app')?.baseUrl ??
      'http://localhost:3000'
    );
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

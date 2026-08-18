import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'node:fs';
import {
  access,
  copyFile,
  mkdir,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { Readable } from 'node:stream';
import { dirname, join, resolve, sep } from 'node:path';
import type { AppConfig } from '@config/configuration';
import type { StorageProvider } from '../interfaces/storage.interface';

@Injectable()
export class LocalStorageService implements StorageProvider {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly storageRoot: string;

  constructor(private readonly configService: ConfigService<AppConfig>) {
    this.storageRoot =
      this.configService.get<AppConfig['storage']>('storage')?.localPath ??
      './storage';
  }

  /**
   * Write a buffer to disk, creating parent directories as needed.
   * @param buffer - Raw file bytes to persist.
   * @param relativePath - Storage-relative destination (e.g. `public/avatars/x.png`).
   * @returns The same `relativePath` (caller uses it as the stable storage key).
   */
  async upload(buffer: Buffer, relativePath: string): Promise<string> {
    const absolutePath = this.getAbsolutePath(relativePath);
    const dir = join(absolutePath, '..');

    await mkdir(dir, { recursive: true });
    await writeFile(absolutePath, buffer);

    this.logger.debug(`File written: ${relativePath}`);
    return relativePath;
  }

  /**
   * Open a file as a `Readable` stream for HTTP serving.
   * @param relativePath - Storage-relative path.
   * @returns A `Readable` stream of the file contents.
   * @throws NotFoundException when the file does not exist on disk.
   */
  async getStream(relativePath: string): Promise<Readable> {
    const absolutePath = this.getAbsolutePath(relativePath);

    try {
      await access(absolutePath);
    } catch {
      throw new NotFoundException(`File not found: ${relativePath}`);
    }

    return createReadStream(absolutePath);
  }

  /**
   * Delete a file. Idempotent — missing files are logged and swallowed
   * (no error thrown).
   * @param relativePath - Storage-relative path.
   * @returns Resolves when the file is gone or was already absent.
   */
  async delete(relativePath: string): Promise<void> {
    const absolutePath = this.getAbsolutePath(relativePath);

    try {
      await unlink(absolutePath);
      this.logger.debug(`File deleted: ${relativePath}`);
    } catch {
      this.logger.warn(`File not found for deletion: ${relativePath}`);
    }
  }

  /**
   * Move/rename a file within storage. Falls back to copy+delete when the
   * source and destination are on different filesystems (EXDEV error). Target
   * directories are created automatically.
   * @param from - Source storage-relative path.
   * @param to - Destination storage-relative path.
   * @throws NotFoundException when the source file is missing.
   */
  async move(from: string, to: string): Promise<void> {
    this.assertWithinRoot(from);
    this.assertWithinRoot(to);

    const fromAbs = this.getAbsolutePath(from);
    const toAbs = this.getAbsolutePath(to);

    await mkdir(dirname(toAbs), { recursive: true });

    try {
      await rename(fromAbs, toAbs);
      this.logger.debug(`File moved: ${from} → ${to}`);
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        throw new NotFoundException(`Source file not found: ${from}`);
      }
      // EXDEV: cross-device — fall back to copy + delete
      if (isNodeError(error) && error.code === 'EXDEV') {
        await copyFile(fromAbs, toAbs);
        await unlink(fromAbs);
        this.logger.debug(`File moved via copy: ${from} → ${to}`);
        return;
      }
      throw error;
    }
  }

  /**
   * Check whether a file exists on disk.
   * @param relativePath - Storage-relative path.
   * @returns `true` if accessible, `false` if missing or unreadable.
   */
  async exists(relativePath: string): Promise<boolean> {
    try {
      await access(this.getAbsolutePath(relativePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolve a storage-relative path to its absolute location under the
   * configured `storageRoot`. The path is traversal-checked before resolution.
   * @param relativePath - Storage-relative path (e.g. `public/avatars/x.png`).
   * @returns Absolute filesystem path.
   * @throws BadRequestException when the resolved path escapes the storage root.
   */
  getAbsolutePath(relativePath: string): string {
    this.assertWithinRoot(relativePath);
    return join(this.storageRoot, relativePath);
  }

  /**
   * Ensure a storage-relative path stays within the storage root (no `../`
   * escapes). Resolves the full path and compares against the root prefix.
   * @param relativePath - Storage-relative path to validate.
   * @throws BadRequestException when the resolved path escapes the root.
   */
  private assertWithinRoot(relativePath: string): void {
    const root = resolve(this.storageRoot);
    const resolved = resolve(this.storageRoot, relativePath);
    if (resolved !== root && !resolved.startsWith(`${root}${sep}`)) {
      throw new BadRequestException(`Path traversal blocked: ${relativePath}`);
    }
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

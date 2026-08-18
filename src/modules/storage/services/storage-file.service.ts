import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { extname } from 'node:path';
import type { Readable } from 'node:stream';
import type { StorageProvider } from '../interfaces/storage.interface';
import { EXT_TO_MIME } from '../storage.constants';

@Injectable()
export class StorageFileService {
  private readonly logger = new Logger(StorageFileService.name);

  constructor(
    @Inject('STORAGE_PROVIDER')
    private readonly storageProvider: StorageProvider,
  ) {}

  /**
   * Open a file for HTTP streaming. Returns both the byte stream and its
   * inferred MIME type so the controller can set the `Content-Type` header.
   * @param relativePath - Storage-relative path (e.g. `public/avatars/x.png`).
   * @returns `{ stream, contentType }` — the stream is caller-owned; pipe it to
   *   the response and let the framework close it.
   * @throws NotFoundException when the file does not exist (delegated from the storage provider).
   */
  async serveFile(
    relativePath: string,
  ): Promise<{ stream: Readable; contentType: string }> {
    const stream = await this.storageProvider.getStream(relativePath);
    const contentType = this.getMimeType(relativePath);

    return { stream, contentType };
  }

  /**
   * Delete a file by storage-relative path and log the deletion.
   * @param relativePath - Storage-relative path to remove.
   * @returns Resolves when the file is deleted (or absent — see provider semantics).
   */
  async deleteFile(relativePath: string): Promise<void> {
    await this.storageProvider.delete(relativePath);
    this.logger.log(`File deleted: ${relativePath}`);
  }

  /**
   * Convert a public storage URL back to its storage-relative key. This is the
   * inverse of the `/api/storage/public/*` serving route: the caller passes the
   * full public URL (e.g. `https://host/api/storage/public/users/avatars/x.png`)
   * and gets back `public/users/avatars/x.png`. Used by feature code to locate an
   * old file for cleanup before replacing it.
   * @param url - Full public storage URL (must start with `/api/storage/public/`).
   * @returns Storage-relative path (e.g. `public/users/avatars/x.png`).
   * @throws BadRequestException when the URL is not a public storage URL or has no path segments.
   */
  urlToRelativePath(url: string): string {
    const pathname = new URL(url).pathname;
    const prefix = '/api/storage/public/';
    if (!pathname.startsWith(prefix)) {
      throw new BadRequestException(`Not a public storage URL: ${url}`);
    }

    const segments = decodeURIComponent(pathname.slice(prefix.length))
      .split('/')
      .filter(Boolean);

    if (segments.length === 0) {
      throw new BadRequestException(`Invalid public storage URL: ${url}`);
    }

    return `public/${segments.join('/')}`;
  }

  /**
   * Map a file extension to its MIME type using the `EXT_TO_MIME` constant
   * table. Falls back to `application/octet-stream` for unknown extensions.
   * @param filename - Filename to inspect (extension extracted via `extname`).
   * @returns MIME type string.
   */
  private getMimeType(filename: string): string {
    const ext = extname(filename).toLowerCase();
    return EXT_TO_MIME[ext] ?? 'application/octet-stream';
  }
}

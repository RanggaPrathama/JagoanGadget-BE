import { Readable } from 'node:stream';

/**
 * Storage abstraction so the rest of the app never touches the filesystem
 * directly. The local implementation is {@link LocalStorageService}; swapping to
 * S3/GCS only requires a new class implementing this interface and rebinding
 * the `STORAGE_PROVIDER` token.
 */
export interface StorageProvider {
  /**
   * Persist a buffer at `relativePath` (e.g. `public/avatars/x.png`).
   * @param buffer - Raw file bytes.
   * @param relativePath - Storage-relative path (must stay within the storage root).
   * @returns The same `relativePath` on success (caller uses it as the stable key).
   */
  upload(buffer: Buffer, relativePath: string): Promise<string>;

  /**
   * Open a file for streaming reads (e.g. to serve it over HTTP).
   * @param relativePath - Storage-relative path.
   * @returns A `Readable` stream of the file contents.
   * @throws NotFoundException when the file does not exist on disk.
   */
  getStream(relativePath: string): Promise<Readable>;

  /**
   * Delete a file. Idempotent — missing files are logged and swallowed.
   * @param relativePath - Storage-relative path.
   * @returns Resolves when the file is gone or was already absent.
   */
  delete(relativePath: string): Promise<void>;

  /**
   * Move/rename a file within storage. Used to promote a staged temp file to its
   * final location; falls back to copy+delete on cross-device renames (EXDEV).
   * @param from - Source storage-relative path.
   * @param to - Destination storage-relative path.
   * @throws NotFoundException when the source is missing; BadRequestException on path traversal.
   */
  move(from: string, to: string): Promise<void>;

  /**
   * Check whether a file exists.
   * @param relativePath - Storage-relative path.
   * @returns `true` if the file is present, `false` otherwise.
   */
  exists(relativePath: string): Promise<boolean>;

  /**
   * Resolve a storage-relative path to its absolute on-disk location.
   * @param relativePath - Storage-relative path.
   * @returns Absolute filesystem path (verified to stay within the storage root).
   * @throws BadRequestException if the resolved path would escape the root (traversal).
   */
  getAbsolutePath(relativePath: string): string;
}

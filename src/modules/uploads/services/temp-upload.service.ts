import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import type { StorageProvider } from '../../storage/interfaces/storage.interface';
import type { UploadPurpose } from '../uploads.constants';
import { UPLOAD_PURPOSE_CONFIG } from '../uploads.constants';

export interface TempUploadResult {
  tempKey: string;
  filename: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class TempUploadService {
  private readonly logger = new Logger(TempUploadService.name);

  constructor(
    @Inject('STORAGE_PROVIDER')
    private readonly storageProvider: StorageProvider,
  ) {}

  /**
   * Consume a raw request body (no body parser on this route), enforce the
   * purpose's size cap, validate magic bytes, and persist to
   * `temp/{purpose}/{uuid}{ext}`. The file is only written after the full body
   * is buffered, so an aborted / oversized upload never leaves a partial file.
   */
  async store(req: Request, purpose: UploadPurpose): Promise<TempUploadResult> {
    const config = UPLOAD_PURPOSE_CONFIG[purpose];

    const contentType = req.headers['content-type'];
    if (
      contentType &&
      (contentType.startsWith('application/json') ||
        contentType.startsWith('application/x-www-form-urlencoded'))
    ) {
      throw new UnsupportedMediaTypeException(
        'Upload raw bytes with a binary Content-Type, not form/JSON',
      );
    }

    const contentLength = Number(req.headers['content-length']);
    if (Number.isFinite(contentLength) && contentLength > config.maxBytes) {
      throw new PayloadTooLargeException(
        `Body exceeds ${config.maxBytes} byte limit for purpose "${purpose}"`,
      );
    }

    const buffer = await this.readBody(req, config.maxBytes);

    const detected = await fileTypeFromBuffer(buffer);
    const mimeType = detected?.mime;
    if (!mimeType || !config.allowedMimes.includes(mimeType)) {
      throw new BadRequestException(
        `File type "${mimeType ?? 'unknown'}" not allowed for purpose "${purpose}"`,
      );
    }

    const ext = this.extensionFor(mimeType);
    const filename = `${randomUUID()}${ext}`;
    const tempKey = `temp/${config.tempFolder}/${filename}`;

    await this.storageProvider.upload(buffer, tempKey);

    this.logger.log(`Temp upload stored: ${tempKey} (${buffer.length} bytes)`);

    return { tempKey, filename, mimeType, size: buffer.length };
  }

  private readBody(req: Request, maxBytes: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;

      const onData = (chunk: Buffer) => {
        size += chunk.length;
        if (size > maxBytes) {
          cleanup();
          req.destroy();
          reject(
            new PayloadTooLargeException(`Body exceeds ${maxBytes} byte limit`),
          );
          return;
        }
        chunks.push(chunk);
      };

      const onEnd = () => {
        cleanup();
        resolve(Buffer.concat(chunks));
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const onAborted = () => {
        cleanup();
        reject(new BadRequestException('Request aborted'));
      };

      const cleanup = () => {
        req.off('data', onData);
        req.off('end', onEnd);
        req.off('error', onError);
        req.off('aborted', onAborted);
      };

      req.on('data', onData);
      req.on('end', onEnd);
      req.on('error', onError);
      req.on('aborted', onAborted);
    });
  }

  private extensionFor(mimeType: string): string {
    const ext = this.mimeToExt[mimeType];
    return ext ?? '.bin';
  }

  private readonly mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      '.xlsx',
  };
}

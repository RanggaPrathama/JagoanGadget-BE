import {
  Controller,
  Delete,
  Get,
  Param,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AllowAnonymous,
  AuthGuard,
  Session,
} from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import { responseSuccess } from '@common/helpers/response.helper';
import { StorageFileService } from './services/storage-file.service';
import { assertSafeFilename } from './validators/safe-path.validator';

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageFileService: StorageFileService) {}

  /**
   * GET /api/storage/public/*path — serve a public file (no auth required).
   * Each path segment is traversal-checked via {@link assertSafeFilename}.
   * The `Cache-Control: immutable` header lets CDNs/browsers cache aggressively.
   * @returns `StreamableFile` with inferred `Content-Type`.
   */
  @Get('public/*path')
  @AllowAnonymous()
  async servePublic(
    @Param('path') path: string | string[],
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = Array.isArray(path) ? path.join('/') : path;
    const segments = raw.split('/').filter(Boolean);
    segments.forEach(assertSafeFilename);

    const { stream, contentType } = await this.storageFileService.serveFile(
      `public/${segments.join('/')}`,
    );

    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    return new StreamableFile(stream);
  }

  /**
   * DELETE /api/storage/public/:filename — delete a public file (auth required).
   * @returns `responseSuccess` (no `data`) on success.
   */
  @Delete('public/:filename')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('bearerAuth')
  async deletePublic(@Param('filename') filename: string) {
    assertSafeFilename(filename);

    await this.storageFileService.deleteFile(`public/${filename}`);

    return responseSuccess(true, 'File deleted successfully');
  }

  /**
   * GET /api/storage/private/:category/:filename — serve a private file.
   * The path is scoped to the authenticated user's folder:
   * `private/{session.user.id}/{category}/{filename}`. An unauthenticated user
   * cannot read another user's files even by guessing the path.
   * @returns `StreamableFile` with `Content-Disposition: inline`.
   */
  @Get('private/:category/:filename')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('bearerAuth')
  async servePrivate(
    @Session() session: UserSession,
    @Param('category') category: string,
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    assertSafeFilename(category);
    assertSafeFilename(filename);

    const { stream, contentType } = await this.storageFileService.serveFile(
      `private/${session.user.id}/${category}/${filename}`,
    );

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${filename}"`,
    });

    return new StreamableFile(stream);
  }

  /**
   * DELETE /api/storage/private/:category/:filename — delete a private file.
   * Scoped to the authenticated user's folder.
   * @returns `responseSuccess` (no `data`) on success.
   */
  @Delete('private/:category/:filename')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('bearerAuth')
  async deletePrivate(
    @Session() session: UserSession,
    @Param('category') category: string,
    @Param('filename') filename: string,
  ) {
    assertSafeFilename(category);
    assertSafeFilename(filename);

    await this.storageFileService.deleteFile(
      `private/${session.user.id}/${category}/${filename}`,
    );

    return responseSuccess(true, 'File deleted successfully');
  }
}

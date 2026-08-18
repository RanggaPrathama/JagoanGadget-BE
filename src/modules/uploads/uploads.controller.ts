import {
  Body,
  Controller,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AllowAnonymous,
  AuthGuard,
  Session,
} from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';
import { responseSuccess } from '@common/helpers/response.helper';
import type { AppConfig } from '@config/configuration';
import { PresignDto } from './dto/presign.dto';
import { PresignService } from './services/presign.service';
import { TempUploadService } from './services/temp-upload.service';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly presignService: PresignService,
    private readonly tempUploadService: TempUploadService,
    private readonly configService: ConfigService<AppConfig>,
  ) {}

  /**
   * POST /api/uploads/presign
   * Authenticated. Returns a signed upload URL the client PUTs raw bytes to.
   */
  @Post('presign')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Dapatkan presigned upload URL',
    description:
      'Langkah 1 dari alur upload. Autentikasi wajib. Mengembalikan uploadUrl yang bisa di-PUT dengan raw bytes file (lihat PUT /api/uploads/temp/:token). Token kedaluwarsa dalam 15 menit.',
  })
  @ApiResponse({ status: 201, description: 'Presigned URL berhasil dibuat' })
  @ApiResponse({ status: 401, description: 'Belum login' })
  async presign(@Session() session: UserSession, @Body() dto: PresignDto) {
    const { token, expiresAt } = this.presignService.create(
      dto.purpose,
      session.user.id,
    );

    const uploadUrl = `${this.baseUrl()}/api/uploads/temp/${token}`;

    return responseSuccess(true, 'Presigned upload URL generated', {
      uploadUrl,
      token,
      expiresAt,
      purpose: dto.purpose,
    });
  }

  /**
   * PUT /api/uploads/temp/:token
   * NO AuthGuard — the signed token IS the authorization. Raw body bytes.
   * Must not use @Body(): the global body parser is disabled, and using
   * @Body() here would make the ValidationPipe 400 on an undefined body.
   */
  @Put('temp/:token')
  @AllowAnonymous()
  @ApiOperation({
    summary: 'Upload raw bytes file ke temp',
    description:
      'Langkah 2 dari alur upload. Kirim body sebagai RAW BYTES file (bukan multipart, bukan base64) dengan Content-Type yang sesuai. Tidak perlu cookie — token di URL adalah otorisasi. Balas dengan tempKey yang dikirim saat commit.',
  })
  @ApiResponse({ status: 200, description: 'File tersimpan di temp' })
  @ApiResponse({
    status: 401,
    description: 'Token tidak valid atau kedaluwarsa',
  })
  @ApiResponse({ status: 413, description: 'Ukuran melebihi batas purpose' })
  @ApiResponse({ status: 400, description: 'Tipe file tidak diizinkan' })
  @ApiResponse({ status: 415, description: 'Content-Type tidak didukung' })
  async uploadTemp(@Param('token') token: string, @Req() req: Request) {
    const payload = this.presignService.verify(token);
    const result = await this.tempUploadService.store(req, payload.purpose);
    return responseSuccess(true, 'Temp file stored successfully', result);
  }

  private baseUrl(): string {
    return (
      this.configService.get<AppConfig['app']>('app')?.baseUrl ??
      'http://localhost:3000'
    );
  }
}

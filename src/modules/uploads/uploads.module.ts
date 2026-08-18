import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from '../storage/storage.module';
import { UploadsController } from './uploads.controller';
import { PresignService } from './services/presign.service';
import { TempUploadService } from './services/temp-upload.service';
import { TempFileService } from './services/temp-file.service';

@Module({
  imports: [StorageModule, ConfigModule],
  controllers: [UploadsController],
  providers: [PresignService, TempUploadService, TempFileService],
  exports: [TempFileService],
})
export class UploadsModule {}

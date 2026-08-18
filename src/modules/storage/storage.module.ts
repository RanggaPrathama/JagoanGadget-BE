import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageController } from './storage.controller';
import { LocalStorageService } from './services/local-storage.service';
import { StorageFileService } from './services/storage-file.service';

@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [
    {
      provide: 'STORAGE_PROVIDER',
      useClass: LocalStorageService,
    },
    StorageFileService,
  ],
  exports: ['STORAGE_PROVIDER', StorageFileService],
})
export class StorageModule {}

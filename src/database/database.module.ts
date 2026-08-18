import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getTypeOrmConfig } from './typeorm.config';
import { StorageUrlSubscriber } from './subscribers/storage-url.subscriber';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),
  ],
  providers: [StorageUrlSubscriber],
})
export class DatabaseModule {}

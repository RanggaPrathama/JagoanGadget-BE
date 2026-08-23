import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandEntity } from './entities/brand.entity';
import { BrandService } from './services/brand.service';
import { BrandController } from './controllers/brand.controller';
import { UploadsModule } from '@module/uploads/uploads.module';

@Module({
  imports: [TypeOrmModule.forFeature([BrandEntity]), UploadsModule],
  controllers: [BrandController],
  providers: [BrandService],
  exports: [TypeOrmModule, BrandService],
})
export class BrandModule {}

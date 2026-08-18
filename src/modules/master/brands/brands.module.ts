import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandEntity } from './entities/brand.entity';
import { BrandService } from './services/brand.service';
import { BrandController } from './controllers/brand.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BrandEntity])],
  controllers: [BrandController],
  providers: [BrandService],
  exports: [TypeOrmModule, BrandService],
})
export class BrandModule {}

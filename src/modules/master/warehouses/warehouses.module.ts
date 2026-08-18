import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehouseEntity } from './entities/warehouse.entity';
import { WarehouseService } from './services/warehouse.service';
import { WarehouseController } from './controllers/warehouse.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WarehouseEntity])],
  controllers: [WarehouseController],
  providers: [WarehouseService],
  exports: [TypeOrmModule, WarehouseService],
})
export class WarehouseModule {}

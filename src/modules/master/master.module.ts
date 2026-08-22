import { Module } from '@nestjs/common';
import { NumberFormatModule } from './numbering/numbering.module';
import { BrandModule } from './brands/brands.module';
import { CategoryModule } from './categories/categories.module';
import { WarehouseModule } from './warehouses/warehouses.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    NumberFormatModule,
    BrandModule,
    CategoryModule,
    WarehouseModule,
    ProductsModule,
  ],
})
export class MasterModule {}

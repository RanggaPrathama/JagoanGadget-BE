import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from './entities/product.entity';
import { ProductSkuEntity } from './entities/product-sku.entity';
import { ProductImageEntity } from './entities/product-image.entity';
import { AttributeEntity } from './entities/attribute.entity';
import { SkuAttributeValueEntity } from './entities/sku-attribute-value.entity';
import { ProductService } from './services/product.service';
import { ProductController } from './controllers/product.controller';
import { ProductAdminController } from './controllers/product-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductEntity,
      ProductSkuEntity,
      ProductImageEntity,
      AttributeEntity,
      SkuAttributeValueEntity,
    ]),
  ],
  controllers: [ProductController, ProductAdminController],
  providers: [ProductService],
  exports: [TypeOrmModule, ProductService],
})
export class ProductsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from './entities/product.entity';
import { ProductSkuEntity } from './entities/product-sku.entity';
import { ProductImageEntity } from './entities/product-image.entity';
import { AttributeEntity } from './entities/attribute.entity';
import { SkuAttributeValueEntity } from './entities/sku-attribute-value.entity';
import { ProductService } from './services/product.service';
import { AttributeService } from './services/attribute.service';
import { ProductController } from './controllers/product.controller';
import { ProductAdminController } from './controllers/product-admin.controller';
import { AttributeAdminController } from './controllers/attribute-admin.controller';

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
  controllers: [
    ProductController,
    ProductAdminController,
    AttributeAdminController,
  ],
  providers: [ProductService, AttributeService],
  exports: [TypeOrmModule, ProductService, AttributeService],
})
export class ProductsModule {}

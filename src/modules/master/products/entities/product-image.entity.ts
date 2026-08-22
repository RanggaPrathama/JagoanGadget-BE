import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { ProductSkuEntity } from './product-sku.entity';

/** Image attached to a SKU (per PRD, images belong to the variant, not the product). */
@Entity({ name: 'product_images' })
export class ProductImageEntity extends BaseEntity {
  @Column({ name: 'sku_id', type: 'uuid' })
  skuId!: string;

  @ManyToOne(() => ProductSkuEntity, (sku) => sku.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sku_id' })
  sku!: ProductSkuEntity;

  @Column({ name: 'image_url', length: 1024 })
  imageUrl!: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary!: boolean;
}

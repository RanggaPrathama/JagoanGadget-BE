import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { ProductEntity } from './product.entity';
import { ProductImageEntity } from './product-image.entity';
import { SkuAttributeValueEntity } from './sku-attribute-value.entity';

/**
 * Physical, sellable unit. Price belongs strictly to the SKU.
 * Every cart/order/stock operation references a `ProductSkuEntity.id`.
 */
@Entity({ name: 'product_skus' })
export class ProductSkuEntity extends BaseEntity {
  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => ProductEntity, (p) => p.skus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  @Index('UQ_product_skus_sku_code', { unique: true })
  @Column({ name: 'sku_code', length: 100 })
  skuCode!: string;

  @Column({ name: 'variant_name', length: 150 })
  variantName!: string;

  /** Stored as numeric(19,2); pg returns it as a STRING. Keep as string to avoid float drift. */
  @Column({ type: 'numeric', precision: 19, scale: 2 })
  price!: string;

  @OneToMany(() => ProductImageEntity, (img) => img.sku, { cascade: false })
  images!: ProductImageEntity[];

  @OneToMany(() => SkuAttributeValueEntity, (v) => v.sku, { cascade: false })
  attributeValues!: SkuAttributeValueEntity[];
}

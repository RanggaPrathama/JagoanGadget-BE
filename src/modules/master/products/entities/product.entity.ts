import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { BrandEntity } from '@module/master/brands/entities/brand.entity';
import { CategoryEntity } from '@module/master/categories/entities/category.entity';
import { ProductSkuEntity } from './product-sku.entity';

/**
 * Parent catalog record. Logical umbrella for display/SEO/category/brand.
 * Has NO price or stock of its own — those live on {@link ProductSkuEntity}.
 */
@Entity({ name: 'products' })
export class ProductEntity extends BaseEntity {
  @Column({ name: 'brand_id', type: 'uuid', nullable: true })
  brandId!: string | null;

  @ManyToOne(() => BrandEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'brand_id' })
  brand!: BrandEntity | null;

  @Index('IDX_products_category_id')
  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => CategoryEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category!: CategoryEntity;

  @Index('IDX_products_name')
  @Column({ length: 150 })
  name!: string;

  @Index('UQ_products_slug', { unique: true })
  @Column({ length: 160 })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @OneToMany(() => ProductSkuEntity, (sku) => sku.product, { cascade: false })
  skus!: ProductSkuEntity[];
}

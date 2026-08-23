import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { ProductSkuEntity } from './product-sku.entity';
import { AttributeEntity } from './attribute.entity';

/** EAV value row. One value per attribute per SKU (composite unique). */
@Entity({ name: 'sku_attribute_values' })
@Unique('UQ_sku_attr', ['skuId', 'attributeId'])
export class SkuAttributeValueEntity extends BaseEntity {
  @Column({ name: 'sku_id', type: 'uuid' })
  skuId!: string;

  @ManyToOne(() => ProductSkuEntity, (sku) => sku.attributeValues, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sku_id' })
  sku!: ProductSkuEntity;

  @Column({ name: 'attribute_id', type: 'uuid' })
  attributeId!: string;

  @ManyToOne(() => AttributeEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'attribute_id' })
  attribute!: AttributeEntity;

  @Column({ type: 'text' })
  value!: string;
}

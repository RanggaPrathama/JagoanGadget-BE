import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

/** EAV key catalog (e.g. "RAM", "Processor"). Global — referenced by value rows, not created per product. */
export enum AttributeDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
}

@Entity({ name: 'attributes' })
export class AttributeEntity extends BaseEntity {
  @Index('UQ_attributes_name', { unique: true })
  @Column({ length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 20, default: AttributeDataType.STRING })
  dataType!: AttributeDataType;
}

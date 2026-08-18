import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

export enum TypePrefix {
  SEQUENCE = 'sequence',
  DAY = 'day',
  MONTH = 'month',
  YEAR = 'year',
  TEXT = 'text',
}

@Entity({ name: 'prefix' })
export class PrefixEntity extends BaseEntity {
  @Index('IDX_prefix_name')
  @Column({ length: 30 })
  name!: string;

  @Column({ length: 50 })
  value!: string;

  @Column({ length: 50, enum: TypePrefix })
  type!: TypePrefix;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;
}

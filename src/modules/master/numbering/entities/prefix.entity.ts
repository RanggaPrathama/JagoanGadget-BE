import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { NumberFormatSegmentEntity } from './number_format_d.entity';

export enum TypePrefix {
  SEQUENCE = 'sequence',
  DAY = 'day',
  MONTH = 'month',
  YEAR = 'year',
  TEXT = 'text',
}

@Entity({ name: 'prefix' })
export class PrefixEntity extends BaseEntity {
  @Index('UQ_prefix_name', { unique: true })
  @Column({ length: 30 })
  name!: string;

  @Column({ length: 50 })
  value!: string;

  @Column({ length: 50, enum: TypePrefix })
  type!: TypePrefix;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @OneToMany(() => NumberFormatSegmentEntity, (segment) => segment.prefix)
  segments!: NumberFormatSegmentEntity[];
}

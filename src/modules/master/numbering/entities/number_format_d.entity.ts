import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { NumberFormatEntity } from './number_format.entity';
import { PrefixEntity } from './prefix.entity';

@Entity({ name: 'number_format_d' })
@Index('UQ_nf_segment_order', ['numberFormatId', 'index'], { unique: true })
export class NumberFormatSegmentEntity extends BaseEntity {
  @ManyToOne(() => NumberFormatEntity, (nf) => nf.segments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'number_format_id' })
  numberFormat!: NumberFormatEntity;

  @Column({ name: 'number_format_id', type: 'uuid' })
  numberFormatId!: string;

  @Column({ type: 'int' })
  index!: number;

  @Column({ name: 'prefix_id', type: 'uuid' })
  prefixId!: string;

  @ManyToOne(() => PrefixEntity, (prefix) => prefix.segments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'prefix_id' })
  prefix!: PrefixEntity;
}

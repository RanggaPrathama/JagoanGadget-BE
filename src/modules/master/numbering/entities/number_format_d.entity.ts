import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { NumberFormatEntity } from './number_format.entity';

export enum SegmentType {
  LITERAL = 'LITERAL',
  PREFIX = 'PREFIX',
}

@Entity({ name: 'number_format_d' })
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

  @Column({ length: 20, enum: SegmentType })
  type!: SegmentType;

  /** Literal text for LITERAL segments (e.g. "INV", "-"). */
  @Column({ name: 'value', length: 50, nullable: true })
  value?: string | null;

  /** PrefixEntity.name for PREFIX segments (e.g. "seq", "year"). */
  @Column({ name: 'prefix_name', length: 30, nullable: true })
  prefixName?: string | null;
}

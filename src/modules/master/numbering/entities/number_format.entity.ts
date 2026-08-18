import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { MenuEntity } from '@module/access-control/entities';
import { NumberFormatSegmentEntity } from './number_format_d.entity';

@Entity({ name: 'number_format' })
export class NumberFormatEntity extends BaseEntity {
  @Index('UQ_number_format_menu', { unique: true })
  @OneToOne(() => MenuEntity, (menu) => menu.number_format, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'menu_id' })
  menu!: MenuEntity | null;

  @Column({ name: 'menu_id', type: 'uuid', nullable: true })
  menuId?: string | null;

  @OneToMany(() => NumberFormatSegmentEntity, (seg) => seg.numberFormat, {
    cascade: true,
  })
  segments!: NumberFormatSegmentEntity[];

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;
}

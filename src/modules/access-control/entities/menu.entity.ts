import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { PermissionEntity } from './permission.entity';
import { NumberFormatEntity } from '@module/master/numbering/entities/number_format.entity';
@Entity({ name: 'menus' })
export class MenuEntity extends BaseEntity {
  @Index('IDX_menus_name')
  @Column({ length: 100 })
  name!: string;

  @Index('UQ_menus_code', { unique: true })
  @Column({ length: 100, unique: true })
  code!: string;

  @Column({ length: 255, nullable: true })
  route!: string | null;

  @Column({ length: 50, default: 'menu' })
  type!: 'group' | 'menu';

  @Column({ name: 'icon_name', length: 100, nullable: true })
  iconName!: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string | null;

  @ManyToOne(() => MenuEntity, (menu) => menu.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent!: MenuEntity | null;

  @OneToMany(() => MenuEntity, (menu) => menu.parent)
  children!: MenuEntity[];

  @OneToMany(() => PermissionEntity, (permission) => permission.menu)
  permissions!: PermissionEntity[];

  @OneToOne(() => NumberFormatEntity, (numberFormat) => numberFormat.menu)
  number_format!: NumberFormatEntity;
}

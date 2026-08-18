import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { MenuEntity } from './menu.entity';
import { RolePermissionEntity } from './role-permission.entity';

@Entity({ name: 'permissions' })
export class PermissionEntity extends BaseEntity {
  @Index('IDX_permissions_menu_id')
  @Column({ name: 'menu_id', type: 'uuid', nullable: true })
  menuId!: string | null;

  @Column({ length: 150 })
  name!: string;

  @Index('UQ_permissions_code', { unique: true })
  @Column({ length: 100, unique: true })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @ManyToOne(() => MenuEntity, (menu) => menu.permissions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'menu_id' })
  menu!: MenuEntity | null;

  @OneToMany(
    () => RolePermissionEntity,
    (rolePermission) => rolePermission.permission,
  )
  rolePermissions!: RolePermissionEntity[];
}

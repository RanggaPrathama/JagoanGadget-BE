import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { UserRoleEntity } from './user-role.entity';
import { RolePermissionEntity } from './role-permission.entity';

@Entity({ name: 'roles' })
export class RoleEntity extends BaseEntity {
  @Index('IDX_roles_name')
  @Column({ length: 100 })
  name!: string;

  @Index('UQ_roles_code', { unique: true })
  @Column({ length: 100, unique: true })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'is_system', default: false })
  isSystem!: boolean;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @OneToMany(() => RolePermissionEntity, (rp) => rp.role)
  rolePermissions!: RolePermissionEntity[];

  @OneToMany(() => UserRoleEntity, (ur) => ur.role)
  userRoles!: UserRoleEntity[];
}

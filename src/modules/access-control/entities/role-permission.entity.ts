import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { PermissionEntity } from '../../access-control/entities/permission.entity';
import { RoleEntity } from './role.entity';

@Entity({ name: 'role_permissions' })
@Unique('UQ_role_permissions_role_permission', ['roleId', 'permissionId'])
export class RolePermissionEntity extends BaseEntity {
  @Index('IDX_role_permissions_role_id')
  @Column({ name: 'role_id', type: 'uuid' })
  roleId!: string;

  @Index('IDX_role_permissions_permission_id')
  @Column({ name: 'permission_id', type: 'uuid' })
  permissionId!: string;

  @ManyToOne(() => RoleEntity, (role) => role.rolePermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role!: RoleEntity;

  @ManyToOne(() => PermissionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission!: PermissionEntity;
}

import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { RoleEntity } from './role.entity';
import { UserEntity } from '@module/users/entities/user.entity';

@Entity({ name: 'user_roles' })
@Unique('UQ_user_roles_user_role', ['userId', 'roleId'])
export class UserRoleEntity extends BaseEntity {
  @Index('IDX_user_roles_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Index('IDX_user_roles_role_id')
  @Column({ name: 'role_id', type: 'uuid' })
  roleId!: string;

  @ManyToOne(() => RoleEntity, (role) => role.userRoles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role!: RoleEntity;

  @ManyToOne(() => UserEntity, (user) => user.userRoles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}

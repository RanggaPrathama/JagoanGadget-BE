import { Column, Entity, Index, OneToMany } from 'typeorm';
import { SessionEntity } from './session.entity';
import { AccountEntity } from './account.entity';
import { UserRoleEntity } from '../../access-control/entities/user-role.entity';
import { StorageUrl } from '@common/decorators/storage-url.decorator';

/**
 * Single `user` table — managed by Better Auth for auth,
 * extended with app-specific columns (phone_number, is_superadmin, etc.)
 */
@Entity({ name: 'user' })
export class UserEntity {
  @Column({ type: 'text', primary: true })
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Index('UQ_user_email', { unique: true })
  @Column({ type: 'text', unique: true })
  email!: string;

  @Column({ name: 'emailVerified', type: 'boolean' })
  emailVerified!: boolean;

  @Column({ name: 'phone_number', length: 30, nullable: true })
  phoneNumber!: string | null;

  @StorageUrl({ defaultConfigKey: 'defaultAvatar' })
  @Column({ name: 'avatar_url', length: 255, nullable: true })
  avatarUrl!: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'is_superadmin', default: false })
  isSuperadmin!: boolean;

  @Column({ name: 'lastActiveAt', type: 'timestamptz', nullable: true })
  lastActiveAt!: Date | null;

  // --- Timestamps (BA-managed) ---
  @Column({
    name: 'createdAt',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @Column({
    name: 'updatedAt',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  // --- Relations ---
  @OneToMany(() => SessionEntity, (s) => s.user)
  sessions!: SessionEntity[];

  @OneToMany(() => AccountEntity, (a) => a.user)
  accounts!: AccountEntity[];

  @OneToMany(() => UserRoleEntity, (ur) => ur.user)
  userRoles!: UserRoleEntity[];
}

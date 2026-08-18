import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UserEntity } from './user.entity';

/**
 * Better Auth `account` table — managed by Better Auth library.
 */
@Entity({ name: 'account' })
export class AccountEntity {
  @Column({ type: 'text', primary: true })
  id!: string;

  @Column({ name: 'accountId', type: 'text' })
  accountId!: string;

  @Column({ name: 'providerId', type: 'text' })
  providerId!: string;

  @Index('account_userId_idx')
  @Column({ name: 'userId', type: 'text' })
  userId!: string;

  @ManyToOne(() => UserEntity, (u) => u.accounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ name: 'accessToken', type: 'text', nullable: true })
  accessToken!: string | null;

  @Column({ name: 'refreshToken', type: 'text', nullable: true })
  refreshToken!: string | null;

  @Column({ name: 'idToken', type: 'text', nullable: true })
  idToken!: string | null;

  @Column({
    name: 'accessTokenExpiresAt',
    type: 'timestamptz',
    nullable: true,
  })
  accessTokenExpiresAt!: Date | null;

  @Column({
    name: 'refreshTokenExpiresAt',
    type: 'timestamptz',
    nullable: true,
  })
  refreshTokenExpiresAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  scope!: string | null;

  @Column({ type: 'text', nullable: true })
  password!: string | null;

  @Column({
    name: 'createdAt',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @Column({
    name: 'updatedAt',
    type: 'timestamptz',
  })
  updatedAt!: Date;
}

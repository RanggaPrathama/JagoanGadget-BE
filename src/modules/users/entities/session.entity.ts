import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UserEntity } from './user.entity';

/**
 * Better Auth `session` table — managed by Better Auth library.
 */
@Entity({ name: 'session' })
export class SessionEntity {
  @Column({ type: 'text', primary: true })
  id!: string;

  @Column({ name: 'expiresAt', type: 'timestamptz' })
  expiresAt!: Date;

  @Index('UQ_session_token', { unique: true })
  @Column({ type: 'text', unique: true })
  token!: string;

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

  @Column({ name: 'ipAddress', type: 'text', nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'userAgent', type: 'text', nullable: true })
  userAgent!: string | null;

  @Index('session_userId_idx')
  @Column({ name: 'userId', type: 'text' })
  userId!: string;

  @ManyToOne(() => UserEntity, (u) => u.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;
}

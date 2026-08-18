import { Column, Entity, Index } from 'typeorm';

/**
 * Better Auth `verification` table — managed by Better Auth library.
 */
@Entity({ name: 'verification' })
export class VerificationEntity {
  @Column({ type: 'text', primary: true })
  id!: string;

  @Index('verification_identifier_idx')
  @Column({ type: 'text' })
  identifier!: string;

  @Column({ type: 'text' })
  value!: string;

  @Column({ name: 'expiresAt', type: 'timestamptz' })
  expiresAt!: Date;

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
}

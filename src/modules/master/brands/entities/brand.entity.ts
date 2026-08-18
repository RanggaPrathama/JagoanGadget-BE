import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

@Entity({ name: 'brands' })
export class BrandEntity extends BaseEntity {
  @Index('IDX_brands_name')
  @Column({ length: 150 })
  name!: string;

  @Column({ name: 'logo_url', length: 512, nullable: true })
  logoUrl!: string | null;
}

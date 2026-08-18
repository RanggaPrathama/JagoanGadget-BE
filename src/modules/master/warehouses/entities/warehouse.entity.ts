import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

@Entity({ name: 'warehouses' })
export class WarehouseEntity extends BaseEntity {
  @Index('UQ_warehouses_code', { unique: true })
  @Column({ length: 50 })
  code!: string;

  @Index('IDX_warehouses_name')
  @Column({ length: 150 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;
}

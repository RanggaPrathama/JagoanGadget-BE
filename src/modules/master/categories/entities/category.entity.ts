import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

@Entity({ name: 'categories' })
export class CategoryEntity extends BaseEntity {
  @Index('IDX_categories_name')
  @Column({ length: 150 })
  name!: string;

  @Index('UQ_categories_slug', { unique: true })
  @Column({ length: 150 })
  slug!: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string | null;

  @ManyToOne(() => CategoryEntity, (cat) => cat.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent!: CategoryEntity | null;

  @OneToMany(() => CategoryEntity, (cat) => cat.parent)
  children!: CategoryEntity[];
}

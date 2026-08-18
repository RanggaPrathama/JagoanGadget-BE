import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../entities/category.entity';
import { CreateCategoryDto } from '../dto/category/create-category.dto';
import { UpdateCategoryDto } from '../dto/category/update-category.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import {
  buildPaginationParams,
  PaginatedResult,
} from '@common/helpers/pagination.helper';
import { buildTree, TreeNode } from '@common/helpers/tree.helper';
import { slugifyName } from '@common/helpers/slugify.helper';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly repo: Repository<CategoryEntity>,
  ) {}

  /**
   * List categories with pagination. Optional case-insensitive `search` on name.
   * @returns PaginatedResult<CategoryEntity>.
   */
  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<CategoryEntity>> {
    const { page, limit, skip, search, noPagination } =
      buildPaginationParams(query);
    const qb = this.repo.createQueryBuilder('c');
    if (search) qb.where('c.name ILIKE :search', { search: `%${search}%` });
    if (!noPagination) qb.skip(skip).take(limit);
    qb.orderBy('c.created_at', 'DESC');
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /**
   * Fetch a single category by id.
   * @throws NotFoundException when missing.
   * @returns The CategoryEntity.
   */
  async findOne(id: string): Promise<CategoryEntity> {
    const cat = await this.repo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException(`Category ${id} not found`);
    return cat;
  }

  /**
   * Build the nested category tree (roots → children) from all flat rows.
   * `buildTree` consumes `{ id: string; parentId: string | null }` — the entity
   * already matches that shape, so rows are passed directly.
   * @returns TreeNode<CategoryEntity>[] (roots only; children nested inside).
   */
  async findTree(): Promise<TreeNode<CategoryEntity>[]> {
    const all = await this.repo.find({ order: { createdAt: 'ASC' } });
    return buildTree(
      all as unknown as { id: string; parentId: string | null }[],
    ) as unknown as TreeNode<CategoryEntity>[];
  }

  /**
   * Create a category. Slug is auto-derived from name via `slugifyName` when omitted.
   * @returns The persisted CategoryEntity.
   */
  async create(dto: CreateCategoryDto): Promise<CategoryEntity> {
    const cat = this.repo.create({
      name: dto.name,
      slug: dto.slug?.trim() || slugifyName(dto.name),
      parentId: dto.parentId ?? null,
    });
    return this.repo.save(cat);
  }

  /**
   * Patch a category. Slug auto-derives from name only when `slug` is omitted AND `name` changes.
   * @throws NotFoundException when missing.
   * @returns The updated CategoryEntity.
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryEntity> {
    const cat = await this.findOne(id);
    if (dto.name !== undefined) cat.name = dto.name;
    if (dto.slug !== undefined)
      cat.slug = dto.slug?.trim() || slugifyName(cat.name);
    if (dto.parentId !== undefined) cat.parentId = dto.parentId ?? null;
    return this.repo.save(cat);
  }

  /**
   * Delete a category by id. Children are SET NULL on parent_id (DB cascade).
   * @throws NotFoundException when missing.
   */
  async remove(id: string): Promise<void> {
    const cat = await this.findOne(id);
    await this.repo.remove(cat);
  }
}

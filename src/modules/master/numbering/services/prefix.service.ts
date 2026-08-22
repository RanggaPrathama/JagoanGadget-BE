import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationQueryPrefixDto } from '../dto/prefix/pagination-query-prefix.dto';
import { CreatePrefixDto } from '../dto/prefix/create-prefix.dto';
import { UpdatePrefixDto } from '../dto/prefix/update-prefix.dto';
import { PrefixEntity } from '../entities/prefix.entity';
import {
  buildPaginationParams,
  PaginatedResult,
} from '@common/helpers/pagination.helper';
import { ShowFilter } from '@common/dto/pagination-query.dto';

@Injectable()
export class PrefixService {
  constructor(
    @InjectRepository(PrefixEntity)
    private readonly prefixRepo: Repository<PrefixEntity>,
  ) {}

  /**
   * List prefixes. Supports search on name + pagination.
   * @returns PaginatedResult<PrefixEntity>
   */
  async findAll(
    query: PaginationQueryPrefixDto,
  ): Promise<PaginatedResult<PrefixEntity>> {
    const { page, limit, skip, search, noPagination } =
      buildPaginationParams(query);
    const qb = this.prefixRepo.createQueryBuilder('p');
    if (search) {
      qb.andWhere('p.name ILIKE :search', { search: `%${search}%` });
    }

    switch (query.show) {
      case ShowFilter.ACTIVE:
        qb.andWhere('p.isActive = true');
        break;
      case ShowFilter.INACTIVE:
        qb.andWhere('p.isActive = false');
        break;
    }
    if (!noPagination) qb.skip(skip).take(limit);
    qb.orderBy('p.name', 'ASC');
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /**
   * Get a single prefix by id.
   * @throws NotFoundException if not found.
   * @returns PrefixEntity
   */
  async findOne(id: string): Promise<PrefixEntity> {
    const p = await this.prefixRepo.findOne({ where: { id } });
    if (!p) throw new NotFoundException(`Prefix ${id} not found`);
    return p;
  }

  /**
   * Create a prefix (token name, value, type).
   * @returns the persisted PrefixEntity
   */
  async create(dto: CreatePrefixDto): Promise<PrefixEntity> {
    return this.prefixRepo.save(
      this.prefixRepo.create({ ...dto, isActive: dto.isActive ?? true }),
    );
  }

  /**
   * Patch a prefix.
   * @returns the updated PrefixEntity
   */
  async update(id: string, dto: UpdatePrefixDto): Promise<PrefixEntity> {
    const p = await this.findOne(id);
    Object.assign(p, dto);
    return this.prefixRepo.save(p);
  }

  /**
   * Delete a prefix by id.
   */
  async remove(id: string): Promise<void> {
    const p = await this.findOne(id);
    await this.prefixRepo.remove(p);
  }
}

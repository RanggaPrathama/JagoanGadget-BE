import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WarehouseEntity } from '../entities/warehouse.entity';
import { CreateWarehouseDto } from '../dto/warehouse/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/warehouse/update-warehouse.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import {
  buildPaginationParams,
  PaginatedResult,
} from '@common/helpers/pagination.helper';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(WarehouseEntity)
    private readonly repo: Repository<WarehouseEntity>,
  ) {}

  /**
   * List warehouses with pagination. Optional case-insensitive `search` on name/code.
   * @returns PaginatedResult<WarehouseEntity>.
   */
  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<WarehouseEntity>> {
    const { page, limit, skip, search, noPagination } =
      buildPaginationParams(query);
    const qb = this.repo.createQueryBuilder('w');
    if (search)
      qb.where('w.name ILIKE :search OR w.code ILIKE :search', {
        search: `%${search}%`,
      });
    if (!noPagination) qb.skip(skip).take(limit);
    qb.orderBy('w.created_at', 'DESC');
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /**
   * Fetch a single warehouse by id.
   * @throws NotFoundException when missing.
   * @returns The WarehouseEntity.
   */
  async findOne(id: string): Promise<WarehouseEntity> {
    const wh = await this.repo.findOne({ where: { id } });
    if (!wh) throw new NotFoundException(`Warehouse ${id} not found`);
    return wh;
  }

  /**
   * Create a warehouse. `isActive` defaults to true when omitted.
   * @returns The persisted WarehouseEntity.
   */
  async create(dto: CreateWarehouseDto): Promise<WarehouseEntity> {
    const wh = this.repo.create({
      code: dto.code,
      name: dto.name,
      address: dto.address ?? null,
      isActive: dto.isActive ?? true,
    });
    return this.repo.save(wh);
  }

  /**
   * Patch a warehouse. Only supplied fields change.
   * @throws NotFoundException when missing.
   * @returns The updated WarehouseEntity.
   */
  async update(id: string, dto: UpdateWarehouseDto): Promise<WarehouseEntity> {
    const wh = await this.findOne(id);
    if (dto.code !== undefined) wh.code = dto.code;
    if (dto.name !== undefined) wh.name = dto.name;
    if (dto.address !== undefined) wh.address = dto.address ?? null;
    if (dto.isActive !== undefined) wh.isActive = dto.isActive;
    return this.repo.save(wh);
  }

  /**
   * Delete a warehouse by id.
   * @throws NotFoundException when missing.
   */
  async remove(id: string): Promise<void> {
    const wh = await this.findOne(id);
    await this.repo.remove(wh);
  }
}

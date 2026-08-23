import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrandEntity } from '../entities/brand.entity';
import { CreateBrandDto } from '../dto/brand/create-brand.dto';
import { UpdateBrandDto } from '../dto/brand/update-brand.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import {
  buildPaginationParams,
  PaginatedResult,
} from '@common/helpers/pagination.helper';
import { TempFileService } from '@module/uploads/services/temp-file.service';

@Injectable()
export class BrandService {
  constructor(
    @InjectRepository(BrandEntity)
    private readonly repo: Repository<BrandEntity>,
    private readonly tempFileService: TempFileService,
  ) {}

  /**
   * List brands with pagination. When `no_pagination` is set, returns all rows.
   * Optional case-insensitive `search` matches the `name` column.
   * @returns PaginatedResult<BrandEntity> with `items`, `total`, `page`, `limit`.
   */
  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<BrandEntity>> {
    const { page, limit, skip, search, noPagination } =
      buildPaginationParams(query);
    const qb = this.repo.createQueryBuilder('b');
    if (search) qb.where('b.name ILIKE :search', { search: `%${search}%` });
    if (!noPagination) qb.skip(skip).take(limit);
    qb.orderBy('b.created_at', 'DESC');
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /**
   * Fetch a single brand by id.
   * @throws NotFoundException when no brand with that id exists.
   * @returns The BrandEntity.
   */
  async findOne(id: string): Promise<BrandEntity> {
    const brand = await this.repo.findOne({ where: { id } });
    if (!brand) throw new NotFoundException(`Brand ${id} not found`);
    return brand;
  }

  /**
   * Create a brand from the validated DTO.
   * @returns The persisted BrandEntity (with generated `id`).
   */
  async create(dto: CreateBrandDto): Promise<BrandEntity> {
    const brand = this.repo.create({
      name: dto.name,
    });

    let logoUrl: string | null = dto.logoUrl ?? null;

    if (logoUrl) {
      logoUrl = await this.tempFileService.promote(logoUrl);
    }

    brand.logoUrl = logoUrl;

    return this.repo.save(brand);
  }

  /**
   * Patch a brand. Only supplied fields are changed.
   * @throws NotFoundException when the brand does not exist.
   * @returns The updated BrandEntity.
   */
  async update(id: string, dto: UpdateBrandDto): Promise<BrandEntity> {
    const brand = await this.findOne(id);
    if (!brand) throw new NotFoundException(`Brand ${id} not found`);
    if (dto.name !== undefined) brand.name = dto.name;

    const oldLogoUrl = brand.logoUrl;
    if (dto.logoUrl) {
      const newLogoUrl = await this.tempFileService.promote(dto.logoUrl);
      brand.logoUrl = newLogoUrl;
    }

    // If the logoUrl was changed, delete the old file from storage.
    if (oldLogoUrl && oldLogoUrl !== brand.logoUrl) {
      await this.tempFileService.deleteByRelativePath(
        this.tempFileService.urlToRelativePath(oldLogoUrl),
      );
    }
    return this.repo.save(brand);
  }

  /**
   * Delete a brand by id.
   * @throws NotFoundException when the brand does not exist.
   */
  async remove(id: string): Promise<void> {
    const brand = await this.findOne(id);
    await this.repo.remove(brand);
  }
}

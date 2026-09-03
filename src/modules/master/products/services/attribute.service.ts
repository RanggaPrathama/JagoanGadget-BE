import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttributeEntity } from '../entities/attribute.entity';
import { CreateAttributeDto } from '../dto/attribute/create-attribute.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import {
  buildPaginationParams,
  PaginatedResult,
} from '@common/helpers/pagination.helper';

@Injectable()
export class AttributeService {
  constructor(
    @InjectRepository(AttributeEntity)
    private readonly repo: Repository<AttributeEntity>,
  ) {}

  /**
   * List attributes (global EAV catalog) with pagination + optional name search.
   * @returns PaginatedResult<AttributeEntity> with `items`, `total`, `page`, `limit`.
   */
  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<AttributeEntity>> {
    const { page, limit, skip, search, noPagination } =
      buildPaginationParams(query);
    const qb = this.repo.createQueryBuilder('a');
    if (search) qb.where('a.name ILIKE :search', { search: `%${search}%` });
    qb.orderBy('a.name', 'ASC');
    if (!noPagination) qb.skip(skip).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /**
   * Fetch a single attribute by id.
   * @throws NotFoundException when no attribute with that id exists.
   * @returns The AttributeEntity.
   */
  async findOne(id: string): Promise<AttributeEntity> {
    const attribute = await this.repo.findOne({ where: { id } });
    if (!attribute) throw new NotFoundException(`Attribute ${id} not found`);
    return attribute;
  }

  /**
   * Create an attribute in the global catalog. Name is unique.
   * @throws BadRequestException when an attribute with the same name exists.
   * @returns The persisted AttributeEntity.
   */
  async create(dto: CreateAttributeDto): Promise<AttributeEntity> {
    const name = dto.name.trim();
    const existing = await this.repo.findOne({ where: { name } });
    if (existing) {
      throw new BadRequestException(`Attribute "${name}" already exists`);
    }
    const attribute = this.repo.create({
      name,
      dataType: dto.dataType ?? undefined,
    });
    return this.repo.save(attribute);
  }

  /**
   * Delete an attribute from the global catalog.
   * @throws NotFoundException when the attribute does not exist.
   */
  async remove(id: string): Promise<void> {
    const attribute = await this.findOne(id);
    // sku_attribute_values.attribute_id has onDelete: RESTRICT — deletion
    // fails naturally when the attribute is still referenced by SKU values.
    await this.repo.remove(attribute);
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PaginationQueryNumberFormatDto } from '../dto/number-format/pagination-query-number-format.dto';
import { CreateNumberFormatDto } from '../dto/number-format/create-number-format.dto';
import { UpdateNumberFormatDto } from '../dto/number-format/update-number-format.dto';
import { SegmentDto } from '../dto/number-format/segment.dto';
import { NumberFormatEntity } from '../entities/number_format.entity';
import {
  NumberFormatSegmentEntity,
  SegmentType,
} from '../entities/number_format_d.entity';
import { PrefixEntity, TypePrefix } from '../entities/prefix.entity';
import {
  buildPaginationParams,
  PaginatedResult,
} from '@common/helpers/pagination.helper';

@Injectable()
export class NumberingService {
  constructor(
    @InjectRepository(NumberFormatEntity)
    private readonly nfRepo: Repository<NumberFormatEntity>,
    @InjectRepository(NumberFormatSegmentEntity)
    private readonly segRepo: Repository<NumberFormatSegmentEntity>,
    @InjectRepository(PrefixEntity)
    private readonly prefixRepo: Repository<PrefixEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * List number formats. Supports pagination.
   * @returns PaginatedResult<NumberFormatEntity>
   */
  async findAll(
    query: PaginationQueryNumberFormatDto,
  ): Promise<PaginatedResult<NumberFormatEntity>> {
    const { page, limit, skip, noPagination } = buildPaginationParams(query);
    const qb = this.nfRepo.createQueryBuilder('nf');
    if (!noPagination) qb.skip(skip).take(limit);
    qb.orderBy('nf.created_at', 'DESC');
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /**
   * Get a single number format by id (with its segments + linked menu).
   * @throws NotFoundException if not found.
   * @returns NumberFormatEntity
   */
  async findOne(id: string): Promise<NumberFormatEntity> {
    const nf = await this.nfRepo.findOne({
      where: { id },
      relations: ['menu', 'segments'],
    });
    if (!nf) throw new NotFoundException(`NumberFormat ${id} not found`);
    return nf;
  }

  /**
   * Create a number format with its ordered segments.
   * @returns the persisted NumberFormatEntity
   */
  async create(dto: CreateNumberFormatDto): Promise<NumberFormatEntity> {
    const nf = this.nfRepo.create({
      menuId: dto.menuId ?? null,
      isActive: dto.isActive ?? true,
      segments: this.toSegmentEntities(dto.segments),
    });
    return this.nfRepo.save(nf);
  }

  /**
   * Patch a number format. Replaces segments when provided.
   * @returns the updated NumberFormatEntity
   */
  async update(
    id: string,
    dto: UpdateNumberFormatDto,
  ): Promise<NumberFormatEntity> {
    const nf = await this.findOne(id);
    if (dto.menuId !== undefined) nf.menuId = dto.menuId ?? null;
    if (dto.isActive !== undefined) nf.isActive = dto.isActive;
    if (dto.segments !== undefined) {
      await this.segRepo.delete({ numberFormatId: id });
      nf.segments = this.toSegmentEntities(dto.segments);
    }
    return this.nfRepo.save(nf);
  }

  /**
   * Delete a number format by id (segments cascade).
   */
  async remove(id: string): Promise<void> {
    const nf = await this.findOne(id);
    await this.nfRepo.remove(nf);
  }

  /**
   * Build the next formatted number from ordered segments.
   * LITERAL segments are echoed; PREFIX segments resolve against the prefix
   * master (SEQUENCE increments + persists inside a transaction).
   * @returns { number } the generated string (not stored here)
   * @throws BadRequestException if the format is inactive.
   */
  async generateNext(id: string): Promise<{ number: string }> {
    const nf = await this.findOne(id);
    if (!nf.isActive) throw new BadRequestException('NumberFormat is inactive');

    const segments = [...nf.segments].sort((a, b) => a.index - b.index);
    const prefixNames = segments
      .filter((s) => s.type === SegmentType.PREFIX && s.prefixName)
      .map((s) => s.prefixName as string);
    const prefixes = await this.prefixRepo.find({
      where: prefixNames.map((name) => ({ name })),
    });
    const byName = new Map(prefixes.map((p) => [p.name, p]));

    return this.dataSource.transaction(async (manager) => {
      const prefixRepo = manager.getRepository(PrefixEntity);
      const parts: string[] = [];

      for (const seg of segments) {
        if (seg.type === SegmentType.LITERAL) {
          parts.push(seg.value ?? '');
          continue;
        }
        const prefix = seg.prefixName ? byName.get(seg.prefixName) : undefined;
        if (!prefix) {
          parts.push(''); // unknown prefix → empty
          continue;
        }
        let value: string;
        if (prefix.type === TypePrefix.SEQUENCE) {
          const next = (parseInt(prefix.value, 10) || 0) + 1;
          value = String(next).padStart(prefix.value.length, '0');
          prefix.value = String(next);
          await prefixRepo.save(prefix);
        } else if (prefix.type === TypePrefix.YEAR) {
          value = String(new Date().getFullYear());
        } else if (prefix.type === TypePrefix.MONTH) {
          value = String(new Date().getMonth() + 1).padStart(2, '0');
        } else if (prefix.type === TypePrefix.DAY) {
          value = String(new Date().getDate()).padStart(2, '0');
        } else {
          value = prefix.value;
        }
        parts.push(value);
      }
      return { number: parts.join('') };
    });
  }

  // create master rable number format detail
  private toSegmentEntities(
    segments: SegmentDto[],
  ): NumberFormatSegmentEntity[] {
    return segments
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((seg) =>
        this.segRepo.create({
          index: seg.index,
          type: seg.type,
          value: seg.type === SegmentType.LITERAL ? (seg.value ?? null) : null,
          prefixName:
            seg.type === SegmentType.PREFIX ? (seg.prefixName ?? null) : null,
        }),
      );
  }
}

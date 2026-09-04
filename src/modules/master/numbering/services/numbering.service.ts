import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { PaginationQueryNumberFormatDto } from '../dto/number-format/pagination-query-number-format.dto';
import { CreateNumberFormatDto } from '../dto/number-format/create-number-format.dto';
import { UpdateNumberFormatDto } from '../dto/number-format/update-number-format.dto';
import { SegmentDto } from '../dto/number-format/segment.dto';
import { NumberFormatEntity } from '../entities/number_format.entity';
import { NumberFormatSegmentEntity } from '../entities/number_format_d.entity';
import { PrefixEntity, TypePrefix } from '../entities/prefix.entity';
import {
  buildPreview,
  renderSegment,
  sequenceWidth,
} from '../helpers/segment-value.helper';
import {
  buildPaginationParams,
  PaginatedResult,
} from '@common/helpers/pagination.helper';
@Injectable()
export class NumberingService {
  private readonly logger = new Logger(NumberingService.name);
  constructor(
    @InjectRepository(NumberFormatEntity)
    private readonly nfRepo: Repository<NumberFormatEntity>,
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
    const { page, limit, skip, noPagination, search, show } =
      buildPaginationParams(query);
    const qb = this.nfRepo.createQueryBuilder('nf');
    if (search) {
      qb.andWhere('nf.preview ILIKE :search', { search: `%${search}%` });
    }
    switch (show) {
      case 'active':
        qb.andWhere('nf.is_active = true');
        break;
      case 'inactive':
        qb.andWhere('nf.is_active = false');
        break;
    }
    qb.orderBy('nf.created_at', 'DESC');
    if (!noPagination) qb.skip(skip).take(limit);
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
      relations: ['menu', 'segments', 'segments.prefix'],
    });
    if (!nf) throw new NotFoundException(`NumberFormat ${id} not found`);
    return nf;
  }

  /**
   * Create a number format with its ordered segments.
   * Preview is computed server-side; the whole write is one transaction.
   * @returns the persisted NumberFormatEntity
   */
  async create(dto: CreateNumberFormatDto): Promise<NumberFormatEntity> {
    this.assertNoDuplicateIndexes(dto.segments);
    const prefixes = await this.resolvePrefixes(
      dto.segments.map((s) => s.prefixId),
    );

    return this.dataSource.transaction(async (manager) => {
      const nf = await manager.save(
        manager.create(NumberFormatEntity, {
          menuId: dto.menuId ?? null,
          isActive: dto.isActive ?? true,
          preview: '', // recomputed right after segments exist
        }),
      );
      nf.segments = await this.replaceSegments(
        manager,
        nf.id,
        dto.segments,
        prefixes,
      );
      nf.preview = buildPreview(nf.segments);
      return manager.save(nf);
    });
  }

  /**
   * Patch a number format. Replaces segments when provided.
   * Preview is recomputed server-side; the whole write is one transaction.
   * @returns the updated NumberFormatEntity
   */
  async update(
    id: string,
    dto: UpdateNumberFormatDto,
  ): Promise<NumberFormatEntity> {
    const nf = await this.findOne(id);
    if (dto.segments !== undefined) this.assertNoDuplicateIndexes(dto.segments);

    return this.dataSource.transaction(async (manager) => {
      if (dto.menuId !== undefined) nf.menuId = dto.menuId ?? null;
      if (dto.isActive !== undefined) nf.isActive = dto.isActive;

      let segments = nf.segments;
      if (dto.segments !== undefined) {
        const prefixes = await this.resolvePrefixes(
          dto.segments.map((s) => s.prefixId),
        );
        segments = await this.replaceSegments(
          manager,
          id,
          dto.segments,
          prefixes,
        );
      }
      nf.preview = buildPreview(segments);
      return manager.save(nf);
    });
  }

  /**
   * Delete a number format by id (segments cascade).
   */
  async remove(id: string): Promise<void> {
    const nf = await this.findOne(id);
    await this.nfRepo.remove(nf);
  }

  /**
   * Dry-run: build an example number from the format's segments WITHOUT
   * reading any transaction table. SEQUENCE shows a zero-padded sample
   * (e.g. "0001") based on the configured width.
   * @returns the example string
   */
  async preview(id: string): Promise<string> {
    const nf = await this.findOne(id);
    if (!nf.isActive)
      throw new BadRequestException(
        'NumberFormat is inactive — cannot preview',
      );
    return buildPreview(nf.segments);
  }

  private quoteIdentifier(name: string): string {
    if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
      throw new BadRequestException(`Invalid table name "${name}"`);
    }
    // Double any embedded quotes (regex above already forbids them).
    return `"${name.replace(/"/g, '""')}"`;
  }

  /**
   * Consume the next number for a format id (internal use / admin tooling).
   */
  async generateNext(id: string): Promise<{ number: string }> {
    const nf = await this.findOne(id); // throws NotFound when missing
    return this.generate(nf);
  }

  /**
   * Consumer API for other modules (orders, invoices, ...): resolve the
   * active format linked to `menuCode` and consume its next number.
   * @throws NotFoundException if no format is configured for that menu.
   */
  async nextDocumentNumber(menuCode: string): Promise<{ number: string }> {
    const nf = await this.nfRepo.findOne({
      where: { menu: { code: menuCode } },
      relations: ['menu', 'segments', 'segments.prefix'],
    });
    if (!nf)
      throw new NotFoundException(
        `No number format configured for menu "${menuCode}"`,
      );
    return this.generate(nf);
  }

  /**
   * Build the next formatted number from ordered segments.
   * The SEQUENCE value is derived from the transaction table linked to the
   * format's menu (menu.code = table name): we render the non-sequence prefix
   * (e.g. "WH-20260827-"), then take the max existing code, extract its
   * trailing number, and increment. Because the date parts are baked into the
   * prefix, the counter naturally resets to 1 whenever the date changes.
   * @throws BadRequestException if the format/inactive, no menu table, or
   *         invalid sequence width.
   */
  private async generate(nf: NumberFormatEntity): Promise<{ number: string }> {
    if (!nf.isActive) throw new BadRequestException('NumberFormat is inactive');

    const segments = [...nf.segments].sort((a, b) => a.index - b.index);
    const seqSegs = segments.filter(
      (s) => s.prefix?.type === TypePrefix.SEQUENCE,
    );
    for (const seg of segments) {
      if (!seg.prefix?.isActive)
        throw new BadRequestException(
          `Prefix ${seg.prefixId} is missing or inactive`,
        );
    }
    if (seqSegs.length > 1)
      throw new BadRequestException('Only one SEQUENCE segment is supported');

    const now = new Date();
    const prefix = segments
      .filter((s) => s.prefix.type !== TypePrefix.SEQUENCE)
      .map((s) => renderSegment(s.prefix, now))
      .join('');

    // Format without a SEQUENCE segment — just the constant prefix.
    if (!seqSegs.length) return { number: prefix };

    const seq = seqSegs[0].prefix!;
    const width = sequenceWidth(seq.value);
    const table = nf.menu?.code?.trim();
    if (!table)
      throw new BadRequestException(
        'NumberFormat with SEQUENCE segment must be linked to a menu',
      );
    const quotedTable = this.quoteIdentifier(table);

    return this.dataSource.transaction(async (manager) => {
      // Parameterized LIKE pattern; table name validated + quoted separately.
      const rows: { code: string }[] | null = await manager.query(
        `SELECT "code" FROM ${quotedTable}
         WHERE "code" LIKE $1
         ORDER BY "code" DESC
         LIMIT 1`,
        [`${prefix}%`],
      );

      const lastStr = rows && rows.length ? rows[0]?.code : undefined;
      const last = Number.parseInt(
        typeof lastStr === 'string' ? lastStr.slice(prefix.length) : '',
        10,
      );
      const next = Number.isFinite(last) ? last + 1 : 1;
      const padded = String(next).padStart(width, '0');
      return { number: prefix + padded };
    });
  }

  /** Reject duplicated segment orders up-front with a clear error. */
  private assertNoDuplicateIndexes(segments: SegmentDto[]): void {
    const idx = new Set<number>();
    for (const s of segments) {
      if (idx.has(s.index))
        throw new BadRequestException(`Duplicate segment index ${s.index}`);
      idx.add(s.index);
    }
  }

  /** Batch-load prefixes by id; unknown ids fail fast. Existence only — active is checked at generation time. */
  private async resolvePrefixes(
    prefixIds: string[],
  ): Promise<Map<string, PrefixEntity>> {
    const uniqueIds = [...new Set(prefixIds)];
    const found = uniqueIds.length
      ? await this.prefixRepo.find({ where: { id: In(uniqueIds) } })
      : [];
    const byId = new Map(found.map((p) => [p.id, p]));
    for (const id of uniqueIds) {
      if (!byId.has(id)) throw new BadRequestException(`Unknown prefix ${id}`);
    }

    this.logger.debug(
      `Resolved ${found.length} prefixes for ${uniqueIds.length} unique ids`,
    );
    return byId;
  }

  /** Delete + re-insert all segments of a format within the caller's transaction. */
  private async replaceSegments(
    manager: EntityManager,
    nfId: string,
    dtos: SegmentDto[],
    prefixesById: Map<string, PrefixEntity>,
  ): Promise<NumberFormatSegmentEntity[]> {
    await manager.delete(NumberFormatSegmentEntity, { numberFormatId: nfId });
    const rows = dtos
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((d) =>
        manager.create(NumberFormatSegmentEntity, {
          numberFormatId: nfId,
          index: d.index,
          prefixId: d.prefixId,
          prefix: prefixesById.get(d.prefixId)!,
        }),
      );
    return manager.save(rows);
  }
}

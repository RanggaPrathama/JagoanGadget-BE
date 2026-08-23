import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProductEntity } from '../entities/product.entity';
import { ProductSkuEntity } from '../entities/product-sku.entity';
import { ProductImageEntity } from '../entities/product-image.entity';
import { AttributeEntity } from '../entities/attribute.entity';
import { SkuAttributeValueEntity } from '../entities/sku-attribute-value.entity';
import { CreateProductDto } from '../dto/product/create-product.dto';
import { UpdateProductDto } from '../dto/product/update-product.dto';
import {
  PaginationQueryDto,
  ShowFilter,
} from '@common/dto/pagination-query.dto';
import {
  buildPaginationParams,
  PaginatedResult,
} from '@common/helpers/pagination.helper';
import { slugifyName } from '@common/helpers/slugify.helper';

/** Shared left-join chain that eager-loads the full SKU matrix for a product. */
const JOIN_SKUS = (qb: any) =>
  qb
    .leftJoinAndSelect('p.skus', 'sku')
    .leftJoinAndSelect('sku.images', 'img')
    .leftJoinAndSelect('sku.attributeValues', 'av')
    .leftJoinAndSelect('av.attribute', 'attr');

/** Short random suffix for slug collision avoidance. */
const randomSuffix = (): string => Math.random().toString(36).slice(2, 10);

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repo: Repository<ProductEntity>,
    @InjectRepository(AttributeEntity)
    private readonly attrRepo: Repository<AttributeEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Atomically create a Product with its SKUs, images, and EAV attribute values.
   * Any failure rolls back the whole write (no orphan SKUs/values).
   * @param dto nested create payload (product + skus[] + per-sku images[]/attributeValues[]).
   * @returns the saved {@link ProductEntity}.
   */
  async createProduct(dto: CreateProductDto): Promise<ProductEntity> {
    const baseSlug = slugifyName(dto.name);
    return this.dataSource.transaction(async (manager) => {
      const prodRepo = manager.getRepository(ProductEntity);
      const skuRepo = manager.getRepository(ProductSkuEntity);
      const imgRepo = manager.getRepository(ProductImageEntity);
      const valRepo = manager.getRepository(SkuAttributeValueEntity);

      let slug = baseSlug;
      if (await prodRepo.findOne({ where: { slug } })) {
        slug = `${baseSlug}-${randomSuffix()}`;
      }

      const product = await prodRepo.save(
        prodRepo.create({
          brandId: dto.brandId ?? null,
          categoryId: dto.categoryId,
          name: dto.name,
          slug,
          description: dto.description ?? null,
          isActive: dto.isActive ?? true,
        }),
      );

      for (const s of dto.skus) {
        const sku = await skuRepo.save(
          skuRepo.create({
            productId: product.id,
            skuCode: s.skuCode,
            variantName: s.variantName,
            price: String(s.price),
          }),
        );
        if (s.images?.length) {
          await imgRepo.save(
            s.images.map((img) =>
              imgRepo.create({
                skuId: sku.id,
                imageUrl: img.imageUrl,
                isPrimary: img.isPrimary ?? false,
              }),
            ),
          );
        }
        if (s.attributeValues?.length) {
          await valRepo.save(
            s.attributeValues.map((v) =>
              valRepo.create({
                skuId: sku.id,
                attributeId: v.attributeId,
                value: v.value,
              }),
            ),
          );
        }
      }
      return product;
    });
  }

  /**
   * List products with pagination/search/status filter.
   * @param query pagination + `search` + `show` (admin only; public forces isActive=true).
   * @param isPublic when true, only active products are returned.
   */
  async findAll(
    query: PaginationQueryDto,
    isPublic = false,
  ): Promise<PaginatedResult<ProductEntity>> {
    const { page, limit, skip, search, noPagination } =
      buildPaginationParams(query);
    const qb = JOIN_SKUS(this.repo.createQueryBuilder('p'));

    if (isPublic) qb.andWhere('p.is_active = :a', { a: true });
    else if (query.show === ShowFilter.INACTIVE)
      qb.andWhere('p.is_active = :a', { a: false });
    else if (query.show === ShowFilter.ACTIVE)
      qb.andWhere('p.is_active = :a', { a: true });

    if (search) qb.andWhere('p.name ILIKE :s', { s: `%${search}%` });

    // count on products only to avoid join-inflated totals
    const total = await qb.clone().select('p.id').getCount();
    if (!noPagination) qb.skip(skip).take(limit);
    qb.orderBy('p.created_at', 'DESC');
    const items = await qb.getMany();
    return { items, total, page, limit };
  }

  /** Min/max SKU price across the filtered product set ("Harga mulai dari Rp X"). */
  async getMinMaxPrice(filter: {
    isActive?: boolean;
    search?: string;
  }): Promise<{
    minPrice: string | null;
    maxPrice: string | null;
  }> {
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoin('p.skus', 'sku')
      .select('MIN(sku.price)', 'min')
      .addSelect('MAX(sku.price)', 'max');
    if (filter.isActive) qb.andWhere('p.is_active = :a', { a: true });
    if (filter.search)
      qb.andWhere('p.name ILIKE :s', { s: `%${filter.search}%` });
    const raw = await qb.getRawOne();
    return { minPrice: raw?.min ?? null, maxPrice: raw?.max ?? null };
  }

  /** Public/admin PDP lookup by slug. Returns full SKU matrix + images + attributes. */
  async findOneBySlug(slug: string, isPublic = false): Promise<ProductEntity> {
    const qb = JOIN_SKUS(
      this.repo
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.category', 'cat')
        .leftJoinAndSelect('p.brand', 'brand'),
    ).where('p.slug = :slug', { slug });
    if (isPublic) qb.andWhere('p.is_active = :a', { a: true });
    const product = await qb.getOne();
    if (!product)
      throw new NotFoundException(`Product slug "${slug}" not found`);
    return product;
  }

  /** Admin lookup by id (full joins). */
  async findOne(id: string): Promise<ProductEntity> {
    const product = await JOIN_SKUS(
      this.repo
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.category', 'cat')
        .leftJoinAndSelect('p.brand', 'brand'),
    )
      .where('p.id = :id', { id })
      .getOne();
    if (!product) throw new NotFoundException(`Product "${id}" not found`);
    return product;
  }

  /** Update product scalar fields only. Slug regenerated if name changes. */
  async update(id: string, dto: UpdateProductDto): Promise<ProductEntity> {
    const product = await this.findOne(id);
    if (dto.name !== undefined && dto.name !== product.name) {
      let slug = slugifyName(dto.name);
      if (await this.repo.findOne({ where: { slug } }))
        slug = `${slug}-${randomSuffix()}`;
      product.slug = slug;
      product.name = dto.name;
    }
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.isActive !== undefined) product.isActive = dto.isActive;
    if (dto.brandId !== undefined) product.brandId = dto.brandId;
    if (dto.categoryId !== undefined) product.categoryId = dto.categoryId;
    return this.repo.save(product);
  }

  /** Delete a product; CASCADE removes SKUs, images, and attribute values. */
  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.repo.remove(product);
  }
}

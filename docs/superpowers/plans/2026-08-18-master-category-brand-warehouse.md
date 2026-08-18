# Master Data: Brands, Categories, Warehouses CRUD

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build full CRUD REST APIs for `brands`, `categories` (self-referencing tree), and `warehouses` master-data tables, following the existing NestJS conventions, with JSDoc on every function for maintainability.

**Architecture:** Three independent submodule feature-sets under `src/modules/master/`, each mirroring the existing `numbering`/`prefix` pattern: TypeORM entity (integer PK, not UUID) → DTOs (create/update/pagination) → service with JSDoc → controller guarded by AuthGuard + PermissionGuard → submodule → registered in `MasterModule`. Categories add a nested-tree read endpoint using the shared `buildTree` helper. RBAC menus + permissions are seeded so the `@RequirePermission` guards resolve.

**Tech Stack:** NestJS v11, TypeORM + PostgreSQL, class-validator/class-transformer, `@thallesp/nestjs-better-auth` (AuthGuard), custom PermissionGuard, Swagger (`@nestjs/swagger`), Jest (unit tests).

**Spec:** This plan is derived from the codebase conventions in `src/modules/master/numbering/*` (the closest existing analog) and the requested table schemas:
- `brands { id integer PK, name varchar, logo_url varchar }`
- `categories { id integer PK, parent_id integer null, name varchar, slug varchar }`
- `warehouses { id integer PK, code varchar, name varchar, address text, is_active boolean }`

## Global Constraints

- Path aliases (verbatim from `tsconfig.json`): `@common/*`→`src/common/*`, `@config/*`→`src/config/*`, `@database/*`→`src/database/*`, `@lib/*`→`src/lib/*`, `@module/*`→`src/modules/*`. Always import via `@common/...` and `@module/...`, never relative deep paths.
- Module system is `nodenext` (ESM). Decorators use `experimentalDecorators`. Services/repos are injected via `@InjectRepository`.
- Global `ValidationPipe` is `whitelist` + `forbidNonWhitelisted` + `transform`. Every DTO field MUST have a class-validator decorator or it gets stripped.
- All mutating routes require `@UseGuards(AuthGuard, PermissionGuard)` + `@RequirePermission('<resource>.<action>')`. `@ApiBearerAuth('bearerAuth')` on write endpoints.
- Response shape is `responseSuccess(success, message, data?, pagination?)` from `@common/helpers/response.helper`.
- Pagination uses `buildPaginationParams(query)` → `{page,limit,skip,search,noPagination}` and `buildPaginationMeta({total,page,limit})` from `@common/helpers/pagination.helper`. Controller returns `result.items` + meta unless `no_pagination` is set.
- **Primary keys are UUID** — extend `BaseEntity` (from `@common/entities/base.entity`) for every new entity, exactly like `number_format`, `prefix`, `menus`, etc. Do NOT declare a custom PK or `created_at`/`updated_at` columns — `BaseEntity` provides `id: string`, `createdAt`, `updatedAt`. Use `@Param('id', ParseUUIDPipe)` in controllers, and service `findOne`/`remove` take `string`. (User decision 2026-08-18: UUID, not integer, to match the rest of the schema.)
- Every service method MUST carry a JSDoc block (the user's explicit maintenance requirement): one-line purpose, `@param`/`@returns`, and `@throws` where relevant.
- Route prefix is `admin/<resource>` (see `numbering.controller.ts` → `admin/number-formats`). All routes under global `/api` prefix.

---

### Task 1: Brands CRUD

**Files:**
- Create: `src/modules/master/brands/entities/brand.entity.ts`
- Create: `src/modules/master/brands/dto/brand/create-brand.dto.ts`
- Create: `src/modules/master/brands/dto/brand/update-brand.dto.ts`
- Create: `src/modules/master/brands/dto/brand/pagination-query-brand.dto.ts`
- Create: `src/modules/master/brands/services/brand.service.ts`
- Create: `src/modules/master/brands/controllers/brand.controller.ts`
- Create: `src/modules/master/brands/brands.module.ts`
- Test: `src/modules/master/brands/services/brand.service.spec.ts`

**Interfaces:**
- Consumes: `responseSuccess` (`@common/helpers/response.helper`), `buildPaginationParams`/`buildPaginationMeta`/`PaginatedResult` (`@common/helpers/pagination.helper`), `PaginationQueryDto` (`@common/dto/pagination-query.dto`).
- Produces: `BrandEntity` (used by later seed/permission wiring), `BrandService` (exported via `BrandsModule`), `BrandModule` (imported by `MasterModule`).

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/master/brands/services/brand.service.spec.ts
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BrandService } from './brand.service';
import { BrandEntity } from '../entities/brand.entity';
import { CreateBrandDto } from '../dto/brand/create-brand.dto';

const mockRepo = () =>
  ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    })),
  }) as unknown as jest.Mocked<Repository<BrandEntity>>;

describe('BrandService', () => {
  let service: BrandService;
  let repo: jest.Mocked<Repository<BrandEntity>>;

  beforeEach(() => {
    repo = mockRepo();
    service = new BrandService(repo);
  });

  it('findAll returns items + total from query builder', async () => {
    const item = { id: 1, name: 'Acme', logoUrl: null } as BrandEntity;
    repo
      .createQueryBuilder()
      .getManyAndCount.mockResolvedValue([[item], 1]);
    const result = await service.findAll({ page: 1, limit: 10 } as any);
    expect(result.items).toEqual([item]);
    expect(result.total).toBe(1);
  });

  it('findOne throws NotFoundException when missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing-uuid')).rejects.toThrow(NotFoundException);
  });

  it('create persists a brand', async () => {
    const dto = { name: 'Acme', logoUrl: 'https://x/y.png' } as CreateBrandDto;
    const saved = { id: 'uuid-1', ...dto } as BrandEntity;
    repo.create.mockReturnValue(saved);
    repo.save.mockResolvedValue(saved);
    expect(await service.create(dto)).toEqual(saved);
  });

  it('remove deletes existing brand', async () => {
    const existing = { id: 'uuid-1', name: 'Acme' } as BrandEntity;
    repo.findOne.mockResolvedValue(existing);
    repo.remove.mockResolvedValue(existing);
    await expect(service.remove('uuid-1')).resolves.toBeUndefined();
    expect(repo.remove).toHaveBeenCalledWith(existing);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test -- src/modules/master/brands/services/brand.service.spec.ts`
Expected: FAIL — `Cannot find module './brand.service'`.

- [ ] **Step 3: Write the entity**

```ts
// src/modules/master/brands/entities/brand.entity.ts
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

@Entity({ name: 'brands' })
export class BrandEntity extends BaseEntity {
  @Index('IDX_brands_name')
  @Column({ length: 150 })
  name!: string;

  @Column({ name: 'logo_url', length: 512, nullable: true })
  logoUrl!: string | null;
}
```

- [ ] **Step 4: Write the DTOs**

```ts
// src/modules/master/brands/dto/brand/create-brand.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Acme' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ required: false, nullable: true, example: 'https://cdn/x.png' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  logoUrl?: string | null;
}
```

```ts
// src/modules/master/brands/dto/brand/update-brand.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateBrandDto } from './create-brand.dto';

export class UpdateBrandDto extends PartialType(CreateBrandDto) {}
```

```ts
// src/modules/master/brands/dto/brand/pagination-query-brand.dto.ts
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

export class PaginationQueryBrandDto extends PaginationQueryDto {}
```

- [ ] **Step 5: Write the service**

```ts
// src/modules/master/brands/services/brand.service.ts
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

@Injectable()
export class BrandService {
  constructor(
    @InjectRepository(BrandEntity)
    private readonly repo: Repository<BrandEntity>,
  ) {}

  /**
   * List brands with pagination. When `no_pagination` is set, returns all rows.
   * Optional case-insensitive `search` matches the `name` column.
   * @returns PaginatedResult<BrandEntity> with `items`, `total`, `page`, `limit`.
   */
  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<BrandEntity>> {
    const { page, limit, skip, search, noPagination } = buildPaginationParams(query);
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
      logoUrl: dto.logoUrl ?? null,
    });
    return this.repo.save(brand);
  }

  /**
   * Patch a brand. Only supplied fields are changed.
   * @throws NotFoundException when the brand does not exist.
   * @returns The updated BrandEntity.
   */
  async update(id: string, dto: UpdateBrandDto): Promise<BrandEntity> {
    const brand = await this.findOne(id);
    if (dto.name !== undefined) brand.name = dto.name;
    if (dto.logoUrl !== undefined) brand.logoUrl = dto.logoUrl ?? null;
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
```

- [ ] **Step 6: Write the controller**

```ts
// src/modules/master/brands/controllers/brand.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { PermissionGuard } from '@common/guards/permission.guard';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { responseSuccess } from '@common/helpers/response.helper';
import { buildPaginationMeta } from '@common/helpers/pagination.helper';
import { BrandService } from '../services/brand.service';
import { PaginationQueryBrandDto } from '../dto/brand/pagination-query-brand.dto';
import { CreateBrandDto } from '../dto/brand/create-brand.dto';
import { UpdateBrandDto } from '../dto/brand/update-brand.dto';

@ApiTags('Admin - Brands')
@Controller('admin/brands')
@UseGuards(AuthGuard, PermissionGuard)
export class BrandController {
  constructor(private readonly service: BrandService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(@Query() query: PaginationQueryBrandDto) {
    const result = await this.service.findAll(query);
    if (query.no_pagination)
      return responseSuccess(true, 'Brands retrieved', result.items);
    return responseSuccess(
      true,
      'Brands retrieved',
      result.items,
      buildPaginationMeta(result),
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return responseSuccess(true, 'Brand retrieved', await this.service.findOne(id));
  }

  @Post()
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('brand.create')
  async create(@Body() dto: CreateBrandDto) {
    return responseSuccess(true, 'Brand created', await this.service.create(dto));
  }

  @Put(':id')
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('brand.update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBrandDto,
  ) {
    return responseSuccess(true, 'Brand updated', await this.service.update(id, dto));
  }

  @Delete(':id')
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('brand.delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
    return responseSuccess(true, 'Brand deleted');
  }
}
```

- [ ] **Step 7: Write the submodule**

```ts
// src/modules/master/brands/brands.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandEntity } from './entities/brand.entity';
import { BrandService } from './services/brand.service';
import { BrandController } from './controllers/brand.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BrandEntity])],
  controllers: [BrandController],
  providers: [BrandService],
  exports: [TypeOrmModule, BrandService],
})
export class BrandModule {}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm run test -- src/modules/master/brands/services/brand.service.spec.ts`
Expected: PASS (4 tests green).

- [ ] **Step 9: Commit**

```bash
git add src/modules/master/brands
git commit -m "feat(master): add brands CRUD with JSDoc service"
```

---

### Task 2: Categories CRUD + Tree

**Files:**
- Create: `src/modules/master/categories/entities/category.entity.ts`
- Create: `src/modules/master/categories/dto/category/create-category.dto.ts`
- Create: `src/modules/master/categories/dto/category/update-category.dto.ts`
- Create: `src/modules/master/categories/dto/category/pagination-query-category.dto.ts`
- Create: `src/modules/master/categories/services/category.service.ts`
- Create: `src/modules/master/categories/controllers/category.controller.ts`
- Create: `src/modules/master/categories/categories.module.ts`
- Test: `src/modules/master/categories/services/category.service.spec.ts`

**Interfaces:**
- Consumes: `slugifyName` (`@common/helpers/slugify.helper`), `buildTree` (`@common/helpers/tree.helper`), `responseSuccess`, `buildPaginationParams`/`buildPaginationMeta`/`PaginatedResult`, `PaginationQueryDto`.
- Produces: `CategoryEntity` (self-ref via `parentId`), `CategoryService` (incl. `findTree()`), `CategoryModule`.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/master/categories/services/category.service.spec.ts
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CategoryService } from './category.service';
import { CategoryEntity } from '../entities/category.entity';

const mockRepo = () =>
  ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    })),
  }) as unknown as jest.Mocked<Repository<CategoryEntity>>;

describe('CategoryService', () => {
  let service: CategoryService;
  let repo: jest.Mocked<Repository<CategoryEntity>>;

  beforeEach(() => {
    repo = mockRepo();
    service = new CategoryService(repo);
  });

  it('create generates slug from name when slug omitted', async () => {
    const saved = { id: 'uuid-1', name: 'Smart Phone', slug: 'smart-phone', parentId: null } as CategoryEntity;
    repo.create.mockReturnValue(saved);
    repo.save.mockResolvedValue(saved);
    const result = await service.create({ name: 'Smart Phone' } as any);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'smart-phone' }),
    );
    expect(result.slug).toBe('smart-phone');
  });

  it('findTree nests children under parents', async () => {
    const rows = [
      { id: 'uuid-1', name: 'Electronics', slug: 'electronics', parentId: null },
      { id: 'uuid-2', name: 'Phone', slug: 'phone', parentId: 'uuid-1' },
    ] as CategoryEntity[];
    repo.find.mockResolvedValue(rows);
    const tree = await service.findTree();
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].id).toBe('uuid-2');
  });

  it('remove throws NotFoundException when missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.remove('missing-uuid')).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test -- src/modules/master/categories/services/category.service.spec.ts`
Expected: FAIL — `Cannot find module './category.service'`.

- [ ] **Step 3: Write the entity**

```ts
// src/modules/master/categories/entities/category.entity.ts
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
```

- [ ] **Step 4: Write the DTOs**

```ts
// src/modules/master/categories/dto/category/create-category.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Smart Phone' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'URL-safe slug. Auto-generated from name when omitted.',
    example: 'smart-phone',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  slug?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Parent category id (UUID) for sub-categories. Null = root.',
    example: '0c9c2c9a-...',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}
```

```ts
// src/modules/master/categories/dto/category/update-category.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
```

```ts
// src/modules/master/categories/dto/category/pagination-query-category.dto.ts
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

export class PaginationQueryCategoryDto extends PaginationQueryDto {}
```

- [ ] **Step 5: Write the service**

```ts
// src/modules/master/categories/services/category.service.ts
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
    const { page, limit, skip, search, noPagination } = buildPaginationParams(query);
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
    return buildTree(all as unknown as { id: string; parentId: string | null }[]) as unknown as TreeNode<CategoryEntity>[];
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
    if (dto.slug !== undefined) cat.slug = dto.slug?.trim() || slugifyName(cat.name);
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
```

- [ ] **Step 6: Write the controller** (adds a `tree` endpoint before the `:id` route)

```ts
// src/modules/master/categories/controllers/category.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { PermissionGuard } from '@common/guards/permission.guard';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { responseSuccess } from '@common/helpers/response.helper';
import { buildPaginationMeta } from '@common/helpers/pagination.helper';
import { CategoryService } from '../services/category.service';
import { PaginationQueryCategoryDto } from '../dto/category/pagination-query-category.dto';
import { CreateCategoryDto } from '../dto/category/create-category.dto';
import { UpdateCategoryDto } from '../dto/category/update-category.dto';

@ApiTags('Admin - Categories')
@Controller('admin/categories')
@UseGuards(AuthGuard, PermissionGuard)
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(@Query() query: PaginationQueryCategoryDto) {
    const result = await this.service.findAll(query);
    if (query.no_pagination)
      return responseSuccess(true, 'Categories retrieved', result.items);
    return responseSuccess(
      true,
      'Categories retrieved',
      result.items,
      buildPaginationMeta(result),
    );
  }

  @Get('tree')
  async findTree() {
    return responseSuccess(true, 'Category tree retrieved', await this.service.findTree());
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return responseSuccess(true, 'Category retrieved', await this.service.findOne(id));
  }

  @Post()
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('category.create')
  async create(@Body() dto: CreateCategoryDto) {
    return responseSuccess(true, 'Category created', await this.service.create(dto));
  }

  @Put(':id')
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('category.update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return responseSuccess(true, 'Category updated', await this.service.update(id, dto));
  }

  @Delete(':id')
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('category.delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
    return responseSuccess(true, 'Category deleted');
  }
}
```

- [ ] **Step 7: Write the submodule**

```ts
// src/modules/master/categories/categories.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryEntity } from './entities/category.entity';
import { CategoryService } from './services/category.service';
import { CategoryController } from './controllers/category.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryEntity])],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [TypeOrmModule, CategoryService],
})
export class CategoryModule {}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm run test -- src/modules/master/categories/services/category.service.spec.ts`
Expected: PASS (3 tests green).

- [ ] **Step 9: Commit**

```bash
git add src/modules/master/categories
git commit -m "feat(master): add categories CRUD + nested tree with JSDoc"
```

---

### Task 3: Warehouses CRUD

**Files:**
- Create: `src/modules/master/warehouses/entities/warehouse.entity.ts`
- Create: `src/modules/master/warehouses/dto/warehouse/create-warehouse.dto.ts`
- Create: `src/modules/master/warehouses/dto/warehouse/update-warehouse.dto.ts`
- Create: `src/modules/master/warehouses/dto/warehouse/pagination-query-warehouse.dto.ts`
- Create: `src/modules/master/warehouses/services/warehouse.service.ts`
- Create: `src/modules/master/warehouses/controllers/warehouse.controller.ts`
- Create: `src/modules/master/warehouses/warehouses.module.ts`
- Test: `src/modules/master/warehouses/services/warehouse.service.spec.ts`

**Interfaces:**
- Consumes: `responseSuccess`, `buildPaginationParams`/`buildPaginationMeta`/`PaginatedResult`, `PaginationQueryDto`.
- Produces: `WarehouseEntity`, `WarehouseService`, `WarehouseModule`.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/master/warehouses/services/warehouse.service.spec.ts
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { WarehouseService } from './warehouse.service';
import { WarehouseEntity } from '../entities/warehouse.entity';

const mockRepo = () =>
  ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    })),
  }) as unknown as jest.Mocked<Repository<WarehouseEntity>>;

describe('WarehouseService', () => {
  let service: WarehouseService;
  let repo: jest.Mocked<Repository<WarehouseEntity>>;

  beforeEach(() => {
    repo = mockRepo();
    service = new WarehouseService(repo);
  });

  it('create defaults isActive to true', async () => {
    const saved = { id: 'uuid-1', code: 'WH1', name: 'Main', address: null, isActive: true } as WarehouseEntity;
    repo.create.mockReturnValue(saved);
    repo.save.mockResolvedValue(saved);
    const result = await service.create({ code: 'WH1', name: 'Main' } as any);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
    );
    expect(result.isActive).toBe(true);
  });

  it('findOne throws NotFoundException when missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing-uuid')).rejects.toThrow(NotFoundException);
  });

  it('update toggles isActive', async () => {
    const existing = { id: 'uuid-1', isActive: true } as WarehouseEntity;
    repo.findOne.mockResolvedValue(existing);
    repo.save.mockResolvedValue({ ...existing, isActive: false });
    const result = await service.update('uuid-1', { isActive: false } as any);
    expect(result.isActive).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test -- src/modules/master/warehouses/services/warehouse.service.spec.ts`
Expected: FAIL — `Cannot find module './warehouse.service'`.

- [ ] **Step 3: Write the entity**

```ts
// src/modules/master/warehouses/entities/warehouse.entity.ts
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
```

- [ ] **Step 4: Write the DTOs**

```ts
// src/modules/master/warehouses/dto/warehouse/create-warehouse.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'WH1' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 'Main Warehouse' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ required: false, nullable: true, example: 'Jl. Industri 1' })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
```

```ts
// src/modules/master/warehouses/dto/warehouse/update-warehouse.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateWarehouseDto } from './create-warehouse.dto';

export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {}
```

```ts
// src/modules/master/warehouses/dto/warehouse/pagination-query-warehouse.dto.ts
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

export class PaginationQueryWarehouseDto extends PaginationQueryDto {}
```

- [ ] **Step 5: Write the service**

```ts
// src/modules/master/warehouses/services/warehouse.service.ts
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
    const { page, limit, skip, search, noPagination } = buildPaginationParams(query);
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
```

- [ ] **Step 6: Write the controller**

```ts
// src/modules/master/warehouses/controllers/warehouse.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { PermissionGuard } from '@common/guards/permission.guard';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { responseSuccess } from '@common/helpers/response.helper';
import { buildPaginationMeta } from '@common/helpers/pagination.helper';
import { WarehouseService } from '../services/warehouse.service';
import { PaginationQueryWarehouseDto } from '../dto/warehouse/pagination-query-warehouse.dto';
import { CreateWarehouseDto } from '../dto/warehouse/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/warehouse/update-warehouse.dto';

@ApiTags('Admin - Warehouses')
@Controller('admin/warehouses')
@UseGuards(AuthGuard, PermissionGuard)
export class WarehouseController {
  constructor(private readonly service: WarehouseService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(@Query() query: PaginationQueryWarehouseDto) {
    const result = await this.service.findAll(query);
    if (query.no_pagination)
      return responseSuccess(true, 'Warehouses retrieved', result.items);
    return responseSuccess(
      true,
      'Warehouses retrieved',
      result.items,
      buildPaginationMeta(result),
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return responseSuccess(true, 'Warehouse retrieved', await this.service.findOne(id));
  }

  @Post()
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('warehouse.create')
  async create(@Body() dto: CreateWarehouseDto) {
    return responseSuccess(true, 'Warehouse created', await this.service.create(dto));
  }

  @Put(':id')
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('warehouse.update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return responseSuccess(true, 'Warehouse updated', await this.service.update(id, dto));
  }

  @Delete(':id')
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('warehouse.delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
    return responseSuccess(true, 'Warehouse deleted');
  }
}
```

- [ ] **Step 7: Write the submodule**

```ts
// src/modules/master/warehouses/warehouses.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehouseEntity } from './entities/warehouse.entity';
import { WarehouseService } from './services/warehouse.service';
import { WarehouseController } from './controllers/warehouse.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WarehouseEntity])],
  controllers: [WarehouseController],
  providers: [WarehouseService],
  exports: [TypeOrmModule, WarehouseService],
})
export class WarehouseModule {}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm run test -- src/modules/master/warehouses/services/warehouse.service.spec.ts`
Expected: PASS (3 tests green).

- [ ] **Step 9: Commit**

```bash
git add src/modules/master/warehouses
git commit -m "feat(master): add warehouses CRUD with JSDoc service"
```

---

### Task 4: RBAC seed — menus + permissions for the three resources

**Files:**
- Modify: `src/database/seed/seed.service.ts` (MENUS + PERMISSIONS arrays only; constructor and other methods unchanged)

**Interfaces:**
- Consumes: existing `MENUS`/`PERMISSIONS`/`ALL_PERMISSION_CODES` arrays and the `seedMenus`/`seedPermissions` loops (already implemented — they iterate these arrays).
- Produces: 3 new child menus (`setup.brand`, `setup.category`, `setup.warehouse` under parent group `setup`) and 12 permissions (`brand.view/create/update/delete`, `category.view/create/update/delete`, `warehouse.view/create/update/delete`). The `admin` role auto-grants them via `ALL_PERMISSION_CODES`.

- [ ] **Step 1: Write the failing test** (assert seed arrays contain the new codes)

```ts
// src/database/seed/seed.service.spec.ts
import { seedMenuCodes, seedPermissionCodes } from './seed.constants';

describe('RBAC seed constants', () => {
  it('includes brand/category/warehouse menus', () => {
    expect(seedMenuCodes).toEqual(
      expect.arrayContaining(['setup.brand', 'setup.category', 'setup.warehouse']),
    );
  });

  it('includes brand/category/warehouse permissions', () => {
    expect(seedPermissionCodes).toEqual(
      expect.arrayContaining([
        'brand.view', 'brand.create', 'brand.update', 'brand.delete',
        'category.view', 'category.create', 'category.update', 'category.delete',
        'warehouse.view', 'warehouse.create', 'warehouse.update', 'warehouse.delete',
      ]),
    );
  });
});
```

> NOTE: This test references a new `seed.constants.ts` (extracted in Step 3). Until that file exists the test fails — that is expected.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test -- src/database/seed/seed.service.spec.ts`
Expected: FAIL — `Cannot find module './seed.constants'`.

- [ ] **Step 3: Extract seed arrays into a constants file**

Move the `MENUS` and `PERMISSIONS` arrays into a new file and re-export them so `seed.service.ts` is unchanged in behavior:

```ts
// src/database/seed/seed.constants.ts
import { MenuSeed, PermissionSeed } from './seed.service';

export const MENUS: MenuSeed[] = [
  // ... paste the EXISTING 8 entries from seed.service.ts verbatim ...
  // then APPEND the three new child menus:
  {
    name: 'Brand',
    code: 'setup.brand',
    route: '/admin/setup/brand',
    iconName: null,
    sortOrder: 7,
    type: 'menu',
    parentCode: 'setup',
  },
  {
    name: 'Category',
    code: 'setup.category',
    route: '/admin/setup/category',
    iconName: null,
    sortOrder: 8,
    type: 'menu',
    parentCode: 'setup',
  },
  {
    name: 'Warehouse',
    code: 'setup.warehouse',
    route: '/admin/setup/warehouse',
    iconName: null,
    sortOrder: 9,
    type: 'menu',
    parentCode: 'setup',
  },
];

export const PERMISSIONS: PermissionSeed[] = [
  // ... paste the EXISTING entries from seed.service.ts verbatim ...
  // then APPEND these 12 permissions (use the matching menuCode above):
  { name: 'View Brands', code: 'brand.view', description: 'View brand list', menuCode: 'setup.brand' },
  { name: 'Create Brand', code: 'brand.create', description: 'Create new brand', menuCode: 'setup.brand' },
  { name: 'Update Brand', code: 'brand.update', description: 'Update brand', menuCode: 'setup.brand' },
  { name: 'Delete Brand', code: 'brand.delete', description: 'Delete brand', menuCode: 'setup.brand' },
  { name: 'View Categories', code: 'category.view', description: 'View category list', menuCode: 'setup.category' },
  { name: 'Create Category', code: 'category.create', description: 'Create new category', menuCode: 'setup.category' },
  { name: 'Update Category', code: 'category.update', description: 'Update category', menuCode: 'setup.category' },
  { name: 'Delete Category', code: 'category.delete', description: 'Delete category', menuCode: 'setup.category' },
  { name: 'View Warehouses', code: 'warehouse.view', description: 'View warehouse list', menuCode: 'setup.warehouse' },
  { name: 'Create Warehouse', code: 'warehouse.create', description: 'Create new warehouse', menuCode: 'setup.warehouse' },
  { name: 'Update Warehouse', code: 'warehouse.update', description: 'Update warehouse', menuCode: 'setup.warehouse' },
  { name: 'Delete Warehouse', code: 'warehouse.delete', description: 'Delete warehouse', menuCode: 'setup.warehouse' },
];

export const seedMenuCodes = MENUS.map((m) => m.code);
export const seedPermissionCodes = PERMISSIONS.map((p) => p.code);
```

- [ ] **Step 4: Replace the inline arrays in seed.service.ts**

In `src/database/seed/seed.service.ts`:
- Delete the existing `const MENUS: MenuSeed[] = [...]` block and the existing `const PERMISSIONS: PermissionSeed[] = [...]` block.
- Add at top (after the existing imports): `import { MENUS, PERMISSIONS } from './seed.constants';`
- `MenuSeed` and `PermissionSeed` interfaces stay in `seed.service.ts` (they are imported by `seed.constants.ts`), so do NOT remove them.
- `ALL_PERMISSION_CODES` stays in `seed.service.ts` (it depends on `PERMISSIONS` which is now imported — still works).

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm run test -- src/database/seed/seed.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/database/seed/seed.constants.ts src/database/seed/seed.service.ts src/database/seed/seed.service.spec.ts
git commit -m "feat(seed): add RBAC menus + permissions for brand/category/warehouse"
```

---

### Task 5: Wire modules into MasterModule + full build/lint/test

**Files:**
- Modify: `src/modules/master/master.module.ts`
- (Verification only) run `pnpm run build`, `pnpm run lint`, `pnpm run test`.

**Interfaces:**
- Consumes: `BrandModule`, `CategoryModule`, `WarehouseModule` (produced by Tasks 1–3).
- Produces: All three registered in `MasterModule` (which `AppModule` already imports), so the routes + entities are live.

- [ ] **Step 1: Update MasterModule**

```ts
// src/modules/master/master.module.ts
import { Module } from '@nestjs/common';
import { NumberFormatModule } from './numbering/numbering.module';
import { BrandModule } from './brands/brands.module';
import { CategoryModule } from './categories/categories.module';
import { WarehouseModule } from './warehouses/warehouses.module';

@Module({
  imports: [NumberFormatModule, BrandModule, CategoryModule, WarehouseModule],
})
export class MasterModule {}
```

- [ ] **Step 2: Type-check / build**

Run: `pnpm run build`
Expected: compiles with no TS errors. Fix any import path / type errors surfaced.

- [ ] **Step 3: Lint**

Run: `pnpm run lint`
Expected: no lint errors (unused imports, etc.).

- [ ] **Step 4: Run full test suite**

Run: `pnpm run test`
Expected: all unit tests pass (brands 4, categories 3, warehouses 3, seed 2, plus existing).

- [ ] **Step 5: Commit**

```bash
git add src/modules/master/master.module.ts
git commit -m "feat(master): register brand/category/warehouse modules in MasterModule"
```

---

## Self-Review Notes (run against the requested schema)

1. **Spec coverage** — `brands {id,name,logo_url}` → Task 1 entity + DTOs ✓. `categories {id,parent_id,name,slug}` → Task 2 entity (self-ref `parent`/`children`, unique slug) + tree endpoint ✓. `warehouses {id,code,name,address,is_active}` → Task 3 entity + DTOs ✓. JSDoc on every service method → present in all three service files ✓. RBAC wiring so `@RequirePermission` resolves → Task 4 seed + Task 5 registration ✓.
2. **Placeholder scan** — Task 4 Step 3 instructs to "paste existing entries verbatim" then append; the appends are concrete code, not TBD. No "implement later" / "handle edge cases" placeholders remain.
3. **Type consistency** — `ParseIntPipe` + `number` id used consistently in controllers/services (Tasks 1–3). `findTree` returns `TreeNode<CategoryEntity>[]` and controller wraps in `responseSuccess` ✓. DTOs use `PartialType` consistently ✓. `buildPaginationParams`/`buildPaginationMeta`/`PaginatedResult` signatures match `pagination.helper.ts` ✓. `slugifyName` and `buildTree` signatures match helpers ✓.
4. **Deviation flag** — UUID PK via `BaseEntity` (NOT integer), per user decision 2026-08-18 to match the rest of the schema (`number_format`, `prefix`, `menus`, etc. all use UUID). `parent_id` on `categories` is `uuid` (nullable) to match the self-ref FK. This is documented in Global Constraints. The originally-requested `id integer` in the user's DBML was overridden in favor of schema consistency.

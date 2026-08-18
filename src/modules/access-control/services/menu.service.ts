import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';
import { PaginationQueryMenuDto } from '../dto/menu/pagination-query-menu.dto';
import {
  buildPaginationParams,
  PaginatedResult,
} from '../../../common/helpers/pagination.helper';
import { CreateMenuDto } from '../dto/menu/create-menu.dto';
import { UpdateMenuDto } from '../dto/menu/update-menu.dto';
import { MenuEntity } from '../entities/menu.entity';
import { PermissionEntity } from '../entities/permission.entity';
import { buildTree, TreeNode } from '@common/helpers/tree.helper';
import { slugifyName } from '@common/helpers/slugify.helper';

export interface HierarchicalCodeResult {
  code: string;
  fullPath: string[];
}

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuEntity)
    private readonly menuRepo: Repository<MenuEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permRepo: Repository<PermissionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Normalize an incoming `parentId` into the stored representation.
   * Empty string `''` (sent by forms to mean "no parent") is coerced to `null`;
   * any other value (including `undefined`) is passed through unchanged.
   * @param parentId - Raw `parentId` from the DTO, or `undefined`.
   * @returns `null` when empty-string, otherwise the original value (`string | undefined`).
   */
  private normalizeParentId(
    parentId?: string | null,
  ): string | null | undefined {
    if (parentId === '') {
      return null;
    }

    return parentId;
  }

  /**
   * Generate hierarchical code from name and optional parentId.
   * Rules:
   * - Base code: lowercase name, spaces → dashes
   * - If parentId provided: prepend direct parent's code only
   * - Example: parent code "setup", name "User" → "setup.user"
   * - Example: parent code "setup.user", name "Tes" → "setup.user.tes"
   * - Validates uniqueness in DB
   */
  private async generateHierarchicalCode(
    name: string,
    parentId?: string | null,
    excludeId?: string,
  ): Promise<HierarchicalCodeResult> {
    // Base code from name
    const baseCode = slugifyName(name);

    let fullCode = baseCode;
    const fullPath: string[] = [baseCode];

    // Build hierarchy from the direct parent code only.
    if (parentId) {
      const parent = await this.menuRepo.findOne({
        where: { id: parentId },
        select: ['id', 'code'],
      });

      if (!parent) {
        throw new NotFoundException(
          `Parent menu with id "${parentId}" not found`,
        );
      }

      fullCode = `${parent.code}.${baseCode}`;
      fullPath.unshift(parent.code);
    }

    // Validate uniqueness (exclude current entity on update)
    const whereCondition: any = { code: fullCode };
    if (excludeId) {
      whereCondition.id = Not(excludeId);
    }

    const existing = await this.menuRepo.findOne({ where: whereCondition });
    if (existing) {
      throw new BadRequestException(
        `Menu code "${fullCode}" already exists${excludeId ? ' (conflicts with another menu)' : ''}`,
      );
    }

    return { code: fullCode, fullPath };
  }

  /**
   * List menus with pagination, search, and status filters.
   * @param query - `PaginationQueryMenuDto` (`page`, `limit`, `search`,
   *   `no_pagination`, `show: 'active'|'inactive'|'all'`, `hasPermission`).
   * @returns `PaginatedResult<MenuEntity>` with each menu's `permissions` joined.
   * @throws Never throws; an empty result set is a valid (zero-total) response.
   */
  async findAll(
    query: PaginationQueryMenuDto,
  ): Promise<PaginatedResult<MenuEntity>> {
    const { page, limit, skip, search, noPagination } =
      buildPaginationParams(query);

    const qb = this.menuRepo
      .createQueryBuilder('menu')
      .leftJoinAndSelect('menu.permissions', 'permission');

    if (search) {
      qb.andWhere('(menu.name ILIKE :search OR menu.code ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (query.hasPermission) {
      qb.andWhere('permission.id IS NOT NULL');
    }

    switch (query.show) {
      case 'active':
        qb.andWhere('menu.isActive = true');
        break;
      case 'inactive':
        qb.andWhere('menu.isActive = false');
        break;
      case 'all':
      default:
        break;
    }
    qb.orderBy('menu.sortOrder', 'ASC').addOrderBy('menu.name', 'ASC');

    if (!noPagination) {
      qb.skip(skip).take(limit);
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * Return the full menu forest as a nested tree (roots → children), ordered by
   * `sortOrder` then `name`. Uses {@link buildTree} over the flat entity list.
   * @returns `TreeNode<MenuEntity>[]` — roots only; children nested inside each node.
   */
  async findTree(): Promise<TreeNode<MenuEntity>[]> {
    const menus = await this.menuRepo.find({
      relations: ['children'],
      order: { sortOrder: 'asc', name: 'asc' },
    });

    return buildTree(menus);
  }

  /**
   * Fetch a single menu with its `parent` and `children` relations.
   * @param id - Menu UUID.
   * @returns The `MenuEntity`.
   * @throws NotFoundException when no menu with that id exists.
   */
  async findOne(id: string): Promise<MenuEntity> {
    const menu = await this.menuRepo.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!menu) {
      throw new NotFoundException(`Menu with id "${id}" not found`);
    }

    return menu;
  }

  /**
   * Create a menu. If `code` is omitted it is generated hierarchically from the
   * name + parent (see {@link MenuService.generateHierarchicalCode}). Groups get
   * `route = null`; `menu`-type rows trigger CRUD permission generation
   * (see {@link MenuService.syncMenuPermissions}).
   * @param dto - `CreateMenuDto`.
   * @returns The persisted `MenuEntity` (with generated `id`/`code`).
   * @throws NotFoundException when `parentId` references a missing menu.
   * @throws BadRequestException when the generated/provided `code` already exists.
   */
  async create(dto: CreateMenuDto): Promise<MenuEntity> {
    const parentId = this.normalizeParentId(dto.parentId);

    if (parentId) {
      const parent = await this.menuRepo.findOne({
        where: { id: parentId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent menu with id "${parentId}" not found`,
        );
      }
    }

    // Generate hierarchical code if not provided
    const codeToUse =
      dto.code ||
      (await this.generateHierarchicalCode(dto.name, parentId).then(
        (r) => r.code,
      ));

    const menu = this.menuRepo.create({
      ...dto,
      code: codeToUse,
      parentId: parentId ?? null,
      ...(dto.type === 'group' && { route: null }),
    });

    const savedMenu = await this.menuRepo.save(menu);

    // Sync permissions for the new menu
    if (dto.type === 'menu') await this.syncMenuPermissions(savedMenu, dto);

    return savedMenu;
  }

  /**
   * Patch a menu. Handles: parent change (with circular-reference + self-parent
   * guards), hierarchical code regeneration when name/parent changes without an
   * explicit `code`, and CRUD permission sync when name/code/type change.
   * Re-fetches the saved row to rehydrate relations before returning.
   * @param id - Menu UUID to update.
   * @param dto - `UpdateMenuDto` (all fields optional).
   * @returns The updated `MenuEntity`.
   * @throws NotFoundException when the menu (or referenced parent) is missing.
   * @throws BadRequestException on self-parent, circular reference, or duplicate code.
   */
  async update(id: string, dto: UpdateMenuDto): Promise<MenuEntity> {
    const menu = await this.findOne(id);
    const parentId = this.normalizeParentId(dto.parentId);

    if (parentId) {
      if (parentId === id) {
        throw new BadRequestException('Menu cannot be its own parent');
      }

      const parent = await this.menuRepo.findOne({
        where: { id: parentId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent menu with id "${parentId}" not found`,
        );
      }

      // Prevent circular reference: ensure parent is not a descendant
      const isDescendant = await this.isDescendant(id, parentId);
      if (isDescendant) {
        throw new BadRequestException(
          'Cannot set parent: would create circular reference',
        );
      }
    }

    // Generate code if name or parentId changed and code not explicitly provided
    let codeToUse = dto.code;
    const nameChanged = dto.name && dto.name !== menu.name;
    const parentChanged =
      dto.parentId !== undefined && dto.parentId !== menu.parentId;

    if ((nameChanged || parentChanged) && !codeToUse) {
      const result = await this.generateHierarchicalCode(
        dto.name ?? menu.name,
        parentId ?? menu.parentId,
        id,
      );
      codeToUse = result.code;
    }

    const codeChanged = codeToUse && codeToUse !== menu.code;

    // Capture old type before Object.assign mutates it
    const oldType = menu.type;

    Object.assign(menu, {
      ...dto,
      code: codeToUse ?? menu.code,
      ...(parentId !== undefined && {
        parentId: parentId,
        parent: parentId === null ? null : undefined,
      }),
      ...(dto.type === 'group' && { route: null }),
    });

    console.log('Updating menu:', {
      id,
      name: menu.name,
      code: menu.code,
      parentId: menu.parentId,
    });

    const savedMenu = await this.menuRepo.save(menu);

    // Re-fetch to get fresh relations (TypeORM doesn't rehydrate after save)
    const updatedMenu = await this.findOne(savedMenu.id);

    // Handle type change scenarios
    const typeChanged = dto.type && dto.type !== oldType;
    if (typeChanged) {
      if (dto.type === 'group') {
        // Changed to group: delete all associated permissions
        await this.permRepo.delete({ menuId: id });
      } else if (dto.type === 'menu') {
        // Changed from group to menu: generate CRUD permissions
        await this.syncMenuPermissions(updatedMenu, {
          name: updatedMenu.name,
          code: updatedMenu.code,
        });
      }
    }

    // Sync permission names/codes when menu name or code changes (only for menus)
    if (
      (nameChanged || codeChanged) &&
      updatedMenu.type === 'menu' &&
      !typeChanged
    ) {
      await this.syncMenuPermissions(updatedMenu, {
        name: updatedMenu.name,
        code: updatedMenu.code,
      });
    }

    return updatedMenu;
  }

  /**
   * Delete a menu and its linked permissions (in a transaction).
   * @param id - Menu UUID.
   * @throws NotFoundException when the menu is missing.
   * @throws BadRequestException when the menu still has child menus.
   */
  async remove(id: string): Promise<void> {
    const menu = await this.findOne(id);

    const childCount = await this.menuRepo.count({
      where: { parentId: id },
    });
    if (childCount > 0) {
      throw new BadRequestException(
        'Cannot delete menu with children. Remove children first.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      // Delete all permissions linked to this menu
      await manager.delete(PermissionEntity, { menuId: id });
      // Then remove the menu
      await manager.remove(menu);
    });
  }

  /**
   * Generate or update CRUD permissions for a menu.
   * Code is derived from the menu NAME (lowercased), not the menu code,
   * so menus sharing the same name share the same permission codes.
   * Pattern:
   *   type='menu'  → {slugName}.view     — "View {name}"
   *                  {slugName}.create   — "Create {name}"
   *                  {slugName}.update   — "Update {name}"
   *                  {slugName}.delete   — "Delete {name}"
   * Because `permissions.code` is globally unique, a code already owned by
   * another menu (same slug name) is left untouched — it represents the same
   * feature.
   */
  /**
   * Create or reconcile the four CRUD permissions (`{slug}.view/.create/.update/.delete`)
   * for a `menu`-type menu. Permission `code` is derived from the menu **name**
   * (slugified), so two menus with the same name share one code (same feature).
   * Because `permissions.code` is globally unique, this method never creates a
   * duplicate: existing codes owned by another menu are left untouched; orphaned
   * codes (no `menuId`) are adopted; owned-by-this-menu codes get name/description
   * refreshed. No-op for `group`-type menus.
   * @param menu - The menu entity (used for its `id` and to read name when `dto` omits it).
   * @param dto - Object carrying at least `name`; `code` is accepted but unused (slug drives the code).
   * @returns Resolves when all four permission rows are reconciled. Returns `void`.
   */
  private async syncMenuPermissions(
    menu: MenuEntity,
    dto: { name: string; code?: string } | CreateMenuDto,
  ): Promise<void> {
    const baseName = dto.name ?? menu.name;
    const baseCode = slugifyName(baseName);

    const permissionTemplates: {
      code: string;
      name: string;
      description: string;
    }[] = [];

    permissionTemplates.push(
      {
        code: `${baseCode}.view`,
        name: `View ${baseName}`,
        description: `View ${baseName}`,
      },
      {
        code: `${baseCode}.create`,
        name: `Create ${baseName}`,
        description: `Create ${baseName}`,
      },
      {
        code: `${baseCode}.update`,
        name: `Update ${baseName}`,
        description: `Update ${baseName}`,
      },
      {
        code: `${baseCode}.delete`,
        name: `Delete ${baseName}`,
        description: `Delete ${baseName}`,
      },
    );

    for (const tmpl of permissionTemplates) {
      // Code is globally unique; find by code alone (menuId can no longer
      // identify a code when two menus share the same name).
      const existing = await this.permRepo.findOne({
        where: { code: tmpl.code },
      });

      if (!existing) {
        // Create new permission
        await this.permRepo.save(
          this.permRepo.create({
            menuId: menu.id,
            code: tmpl.code,
            name: tmpl.name,
            description: tmpl.description,
          }),
        );
        continue;
      }

      if (existing.menuId == null) {
        // Orphaned code (e.g. seeded without a menu link): adopt it.
        await this.permRepo.update(existing.id, {
          menuId: menu.id,
          ...(existing.name !== tmpl.name && { name: tmpl.name }),
          ...(existing.description !== tmpl.description && {
            description: tmpl.description,
          }),
        });
        continue;
      }

      if (existing.menuId !== menu.id) {
        // Code owned by another menu with the same slug name — same feature.
        // Leave it; creating would violate UQ_permissions_code.
        continue;
      }

      // Owned by this menu: update name/description if changed
      if (
        existing.name !== tmpl.name ||
        existing.description !== tmpl.description
      ) {
        await this.permRepo.update(existing.id, {
          name: tmpl.name,
          description: tmpl.description,
        });
      }
    }
  }

  /**
   * Check if targetId is a descendant of ancestorId (for circular reference prevention)
   */
  /**
   * Walk up the parent chain from `targetId` to decide whether `ancestorId`
   * is a (transitive) descendant of it. Used to block circular parent references
   * before saving a menu.
   * @param ancestorId - The prospective parent menu id.
   * @param targetId - The menu being reparented (start of the walk).
   * @returns `true` if `ancestorId` appears anywhere in `targetId`'s ancestry
   *   (i.e. making it the parent would create a cycle), otherwise `false`.
   */
  private async isDescendant(
    ancestorId: string,
    targetId: string,
  ): Promise<boolean> {
    let currentId: string | null = targetId;
    while (currentId) {
      if (currentId === ancestorId) {
        return true;
      }
      const menu = await this.menuRepo.findOne({
        where: { id: currentId },
        select: ['parentId'],
      });
      currentId = menu?.parentId ?? null;
    }
    return false;
  }

  /**
   * Preview the hierarchical `code` a menu would get, without persisting anything.
   * Intended for create/edit forms so the UI can show the generated code before
   * submit. Delegates to {@link MenuService.generateHierarchicalCode} (validates
   * uniqueness, so it may throw if the code already exists).
   * @param name - Menu display name.
   * @param parentId - Optional parent menu UUID (null/undefined → top-level code).
   * @returns `HierarchicalCodeResult` (`code` + `fullPath[]` of ancestor codes).
   * @throws BadRequestException when the generated code already exists (excluding nothing).
   * @throws NotFoundException when `parentId` references a missing menu.
   */
  async previewHierarchicalCode(
    name: string,
    parentId?: string | null,
  ): Promise<HierarchicalCodeResult> {
    return this.generateHierarchicalCode(name, parentId);
  }
}

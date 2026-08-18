import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import {
  buildPaginationParams,
  PaginatedResult,
} from '../../../common/helpers/pagination.helper';
import { PermissionCacheService } from './permission-cache.service';
import { UserRoleEntity } from '../entities/user-role.entity';
import { CreateRoleDto } from '../dto/role/create-role.dto';
import { UpdateRoleDto } from '../dto/role/update-role.dto';
import { PermissionEntity } from '../entities/permission.entity';
import { RolePermissionEntity } from '../entities/role-permission.entity';
import { RoleEntity } from '../entities/role.entity';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermRepo: Repository<RolePermissionEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepo: Repository<UserRoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepo: Repository<PermissionEntity>,
    private readonly dataSource: DataSource,
    private readonly permissionCache: PermissionCacheService,
  ) {}

  /**
   * List roles with pagination and case-insensitive `search` (name/code).
   * Each row joins its `rolePermissions` (for the count/assignments shown in list views).
   * @param query - `PaginationQueryDto` (`page`, `limit`, `search`, `no_pagination`).
   * @returns `PaginatedResult<RoleEntity>` ordered by `name` ascending.
   */
  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<RoleEntity>> {
    const { page, limit, skip, search, noPagination } =
      buildPaginationParams(query);

    const qb = this.roleRepo
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.rolePermissions', 'rolePerm');

    if (search) {
      qb.andWhere('(role.name ILIKE :search OR role.code ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    qb.orderBy('role.name', 'ASC');

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
   * Fetch a single role with its full permission graph
   * (`rolePermissions → permission → permission.menu`) loaded.
   * @param id - Role UUID.
   * @returns The `RoleEntity` (with `rolePermissions` hydrated).
   * @throws NotFoundException when no role with that id exists.
   */
  async findOne(id: string): Promise<RoleEntity> {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: [
        'rolePermissions',
        'rolePermissions.permission',
        'rolePermissions.permission.menu',
      ],
    });
    if (!role) {
      throw new NotFoundException(`Role with id "${id}" not found`);
    }
    return role;
  }

  /**
   * Build the permission-assignment view model for a role: every permission in
   * the system, grouped by menu, with `is_checked` marking which ones this role
   * holds. Only menus containing at least one checked permission are returned,
   * sorted by `menu.sortOrder`. Powers the role-permission edit UI.
   * @param id - Role UUID.
   * @returns Object: role identity fields (`id,name,code,description,isSystem,isActive`)
   *   plus `menus: MenuPermissionGroup[]` (each with `permissions[]` carrying `is_checked`).
   * @throws NotFoundException when the role is missing.
   */
  async findOneWithPermissionMapping(id: string) {
    const role = await this.findOne(id);

    const allPermissions = await this.permissionRepo.find({
      relations: ['menu'],
      order: { menu: { sortOrder: 'ASC' }, name: 'ASC' },
    });

    const assigned = await this.rolePermRepo.find({
      where: { roleId: id },
      select: ['permissionId'],
    });
    const assignedIds = new Set(assigned.map((rp) => rp.permissionId));

    const menuMap = new Map<
      string,
      {
        id: string | null;
        name: string;
        code: string | null;
        iconName: string | null;
        sortOrder: number;
        permissions: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          is_checked: boolean;
        }[];
      }
    >();

    for (const perm of allPermissions) {
      const menuKey = perm.menuId ?? 'no-menu';

      if (!menuMap.has(menuKey)) {
        menuMap.set(menuKey, {
          id: perm.menu?.id ?? null,
          name: perm.menu?.name ?? 'Ungrouped',
          code: perm.menu?.code ?? null,
          iconName: perm.menu?.iconName ?? null,
          sortOrder: perm.menu?.sortOrder ?? 0,
          permissions: [],
        });
      }

      menuMap.get(menuKey)!.permissions.push({
        id: perm.id,
        name: perm.name,
        code: perm.code,
        description: perm.description,
        is_checked: assignedIds.has(perm.id),
      });
    }

    const menus = Array.from(menuMap.values())
      .filter((menu) => menu.permissions.some((p) => p.is_checked))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      id: role.id,
      name: role.name,
      code: role.code,
      description: role.description,
      isSystem: role.isSystem,
      isActive: role.isActive,
      menus,
    };
  }

  /**
   * Create a role, optionally assigning permissions in one transaction.
   * `code` must be globally unique (DB constraint).
   * @param dto - `CreateRoleDto` (`name`, `code`, optional `description`, `isSystem`, `isActive`, `permissionIds`).
   * @returns The persisted `RoleEntity`.
   * @throws BadRequestException when a role with the same `code` already exists.
   */
  async create(dto: CreateRoleDto): Promise<RoleEntity> {
    const existing = await this.roleRepo.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(
        `Role with code "${dto.code}" already exists`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const role = manager.create(RoleEntity, {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        isSystem: dto.isSystem,
        isActive: dto.isActive,
      });
      const saved = await manager.save(role);

      if (dto.permissionIds?.length) {
        await this.upsertRolePermissionsInTx(
          manager,
          saved.id,
          dto.permissionIds,
        );
      }

      return saved;
    });
  }

  /**
   * Patch a role (identity fields) and optionally replace its permission set.
   * On permission change, invalidates the Redis cache for the role
   * (see {@link PermissionCacheService.invalidateByRoleId}).
   * @param id - Role UUID.
   * @param dto - `UpdateRoleDto` (all fields optional; `permissionIds` replaces the full set when present).
   * @returns The updated `RoleEntity`.
   * @throws NotFoundException when the role is missing.
   * @throws BadRequestException when the new `code` collides with another role.
   */
  async update(id: string, dto: UpdateRoleDto): Promise<RoleEntity> {
    const role = await this.findOne(id);

    if (dto.code && dto.code !== role.code) {
      const existing = await this.roleRepo.findOne({
        where: { code: dto.code },
      });
      if (existing) {
        throw new BadRequestException(
          `Role with code "${dto.code}" already exists`,
        );
      }
    }

    const updatedRole = await this.dataSource.transaction(async (manager) => {
      Object.assign(role, {
        name: dto.name ?? role.name,
        code: dto.code ?? role.code,
        description: dto.description ?? role.description,
        isSystem: dto.isSystem ?? role.isSystem,
        isActive: dto.isActive ?? role.isActive,
      });
      const result = await manager.save(role);

      if (dto.permissionIds) {
        await this.upsertRolePermissionsInTx(
          manager,
          result.id,
          dto.permissionIds,
        );
      }

      return result;
    });

    if (dto.permissionIds) {
      await this.permissionCache.invalidateByRoleId(updatedRole.id);
    }

    return updatedRole;
  }

  /**
   * Replace a role's `role_permissions` rows within a transaction: deletes the
   * existing set, then inserts one join row per (deduplicated) `permissionId`.
   * Deduplication guards the unique `(roleId, permissionId)` constraint against
   * repeated ids in the payload.
   * @param manager - TypeORM `EntityManager` for the active transaction.
   * @param roleId - Role UUID.
   * @param permissionIds - Permission UUIDs to assign (duplicates removed).
   * @returns Resolves when the join rows are written. Returns `void`.
   */
  private async upsertRolePermissionsInTx(
    manager: EntityManager,
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    await manager.delete(RolePermissionEntity, { roleId });

    // Guard against duplicate ids in the payload — the join table has a
    // unique constraint on (roleId, permissionId), so a repeated id would
    // fail the batch insert.
    const uniqueIds = [...new Set(permissionIds)];

    if (uniqueIds.length > 0) {
      const entities = uniqueIds.map((permissionId) =>
        manager.create(RolePermissionEntity, { roleId, permissionId }),
      );
      await manager.save(RolePermissionEntity, entities);
    }
  }

  /**
   * Delete a role. Blocked for system roles and for roles that still have users.
   * Invalidates the role's permission cache (and thus every member's) before removal.
   * @param id - Role UUID.
   * @throws NotFoundException when the role is missing.
   * @throws BadRequestException when the role is a system role or still has assigned users.
   */
  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system role');
    }

    const userCount = await this.userRoleRepo.count({
      where: { roleId: id },
    });
    if (userCount > 0) {
      throw new BadRequestException(
        'Cannot delete role with assigned users. Unassign users first.',
      );
    }

    await this.permissionCache.invalidateByRoleId(id);
    await this.roleRepo.remove(role);
  }

  /**
   * Replace the full permission set of a role (used by the assign-permissions endpoint).
   * Runs in a transaction and invalidates the role's cache afterwards so the next
   * permission check sees the new set.
   * @param roleId - Role UUID.
   * @param permissionIds - Permission UUIDs to assign (duplicates removed by the worker).
   * @returns Resolves when the assignment is persisted and the cache invalidated. Returns `void`.
   * @throws NotFoundException when the role is missing.
   */
  async setRolePermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    await this.findOne(roleId);

    await this.dataSource.transaction(async (manager) => {
      await this.upsertRolePermissionsInTx(manager, roleId, permissionIds);
    });

    await this.permissionCache.invalidateByRoleId(roleId);
  }
}

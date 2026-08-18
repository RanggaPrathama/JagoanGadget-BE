import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryPermissionDto } from '../dto/permission/query-permission.dto';
import {
  buildPaginationParams,
  PaginatedResult,
} from '../../../common/helpers/pagination.helper';
import { CreatePermissionDto } from '../dto/permission/create-permission.dto';
import { UpdatePermissionDto } from '../dto/permission/update-permission.dto';
import { PermissionEntity } from '../entities/permission.entity';
import { RolePermissionEntity } from '../entities/role-permission.entity';
import { PermissionCacheService } from './permission-cache.service';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permRepo: Repository<PermissionEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermRepo: Repository<RolePermissionEntity>,
    private readonly permissionCache: PermissionCacheService,
  ) {}

  /**
   * List permissions with pagination, case-insensitive `search` (name/code), and
   * optional `menuIds` CSV filter. Each row joins its `menu` and `rolePermissions`.
   * @param query - `QueryPermissionDto` (`page`, `limit`, `search`, `no_pagination`, `menuIds`).
   * @returns `PaginatedResult<PermissionEntity>` ordered by `code` ascending.
   */
  async findAll(
    query: QueryPermissionDto,
  ): Promise<PaginatedResult<PermissionEntity>> {
    const { page, limit, skip, search, noPagination } =
      buildPaginationParams(query);

    const qb = this.permRepo
      .createQueryBuilder('permission')
      .leftJoinAndSelect('permission.menu', 'menu')
      .leftJoinAndSelect('permission.rolePermissions', 'rolePermission');

    if (search) {
      qb.andWhere(
        '(permission.name ILIKE :search OR permission.code ILIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }

    if (query.menuIds) {
      const menuIds = query.menuIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      if (menuIds.length) {
        qb.andWhere('permission.menuId IN (:...menuIds)', { menuIds });
      }
    }

    qb.orderBy('permission.code', 'ASC');

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
   * Fetch a single permission with its `menu` and `rolePermissions` relations.
   * @param id - Permission UUID.
   * @returns The `PermissionEntity`.
   * @throws NotFoundException when no permission with that id exists.
   */
  async findOne(id: string): Promise<PermissionEntity> {
    const perm = await this.permRepo.findOne({
      where: { id },
      relations: ['menu', 'rolePermissions'],
    });
    if (!perm) {
      throw new NotFoundException(`Permission with id "${id}" not found`);
    }
    return perm;
  }

  /**
   * Create a permission. `code` must be globally unique (enforced by DB constraint).
   * @param dto - `CreatePermissionDto`.
   * @returns The persisted `PermissionEntity`.
   * @throws BadRequestException when a permission with the same `code` already exists.
   */
  async create(dto: CreatePermissionDto): Promise<PermissionEntity> {
    const existing = await this.permRepo.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(
        `Permission with code "${dto.code}" already exists`,
      );
    }

    const perm = this.permRepo.create(dto);
    return this.permRepo.save(perm);
  }

  /**
   * Patch a permission. On any change, invalidates the Redis permission cache for
   * every role that references this permission (via {@link PermissionCacheService.invalidateByRoleId}).
   * @param id - Permission UUID.
   * @param dto - `UpdatePermissionDto` (all fields optional; `code` change is uniqueness-checked).
   * @returns The updated `PermissionEntity`.
   * @throws NotFoundException when the permission is missing.
   * @throws BadRequestException when the new `code` collides with another permission.
   */
  async update(
    id: string,
    dto: UpdatePermissionDto,
  ): Promise<PermissionEntity> {
    const perm = await this.findOne(id);

    if (dto.code && dto.code !== perm.code) {
      const existing = await this.permRepo.findOne({
        where: { code: dto.code },
      });
      if (existing) {
        throw new BadRequestException(
          `Permission with code "${dto.code}" already exists`,
        );
      }
    }

    Object.assign(perm, dto);
    const saved = await this.permRepo.save(perm);

    // Invalidate cache for all roles that reference this permission
    const affectedRoleIds = await this.rolePermRepo.find({
      where: { permissionId: id },
      select: ['roleId'],
    });
    const uniqueRoleIds = [...new Set(affectedRoleIds.map((rp) => rp.roleId))];
    await Promise.all(
      uniqueRoleIds.map((roleId) =>
        this.permissionCache.invalidateByRoleId(roleId),
      ),
    );

    return saved;
  }

  /**
   * Delete a permission. Blocked while any role still references it (must unassign first).
   * @param id - Permission UUID.
   * @throws NotFoundException when the permission is missing.
   * @throws BadRequestException when `role_permissions` still references this permission.
   */
  async remove(id: string): Promise<void> {
    const perm = await this.findOne(id);

    const refCount = await this.rolePermRepo.count({
      where: { permissionId: id },
    });
    if (refCount > 0) {
      throw new BadRequestException(
        'Cannot delete permission assigned to roles. Unassign first.',
      );
    }

    await this.permRepo.remove(perm);
  }
}

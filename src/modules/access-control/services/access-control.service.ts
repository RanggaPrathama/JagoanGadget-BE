import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MenuEntity } from '../entities/menu.entity';
import { PermissionEntity } from '../entities/permission.entity';
import { RoleEntity } from '../entities/role.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import { PermissionCacheService } from './permission-cache.service';
import { buildTree } from '@common/helpers/tree.helper';
import { slugifyName } from '@common/helpers/slugify.helper';

@Injectable()
export class AccessControlService {
  private readonly logger = new Logger(AccessControlService.name);

  constructor(
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepo: Repository<UserRoleEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permRepo: Repository<PermissionEntity>,
    @InjectRepository(MenuEntity)
    private readonly menuRepo: Repository<MenuEntity>,
    private readonly permissionCache: PermissionCacheService,
  ) {}

  /**
   * Check whether a Better Auth user is flagged as superadmin.
   * Reads the `is_superadmin` column directly (bypasses the role/permission graph).
   * @param authUserId - Better Auth user id (`user.id`).
   * @returns `true` when the user's `is_superadmin` flag is set, otherwise `false`.
   */
  async getSuperadminStatus(authUserId: string): Promise<boolean> {
    const user = await this.roleRepo.manager.query(
      `SELECT "is_superadmin" FROM "user" WHERE "id" = $1`,
      [authUserId],
    );
    return user?.[0]?.is_superadmin === true;
  }

  /**
   * Resolve the flat list of permission codes granted to a user.
   * Superadmin → every permission code in the system (full access).
   * Regular user → resolved from `user_roles → role_permissions → permissions`,
   * cached in Redis per user (see {@link PermissionCacheService}) to avoid
   * re-querying on every request.
   * @param authUserId - Better Auth user id.
   * @returns Array of permission `code` strings (e.g. `['menu.view','role.update']`).
   *   Empty array when the user has no roles/permissions. Never `null`.
   */
  async getUserPermissionCodes(authUserId: string): Promise<string[]> {
    if (await this.getSuperadminStatus(authUserId)) {
      const allPerms = await this.permRepo.find({ select: { code: true } });
      return allPerms.map((p) => p.code);
    }

    const cached = await this.permissionCache.get(authUserId);
    if (cached) return cached;

    const result = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin('ur.role', 'role')
      .innerJoin('role.rolePermissions', 'rp')
      .innerJoin('rp.permission', 'perm')
      .where('ur.userId = :authUserId', { authUserId })
      .select('DISTINCT perm.code', 'code')
      .getRawMany<{ code: string }>();

    const permissions = result.map((r) => r.code);
    await this.permissionCache.set(authUserId, permissions);

    this.logger.debug(
      { userId: authUserId, permissionCodes: permissions },
      'User permissions resolved',
    );
    return permissions;
  }

  /**
   * Build the admin-side access-control payload for a user: whether they may
   * enter the admin area, their assigned roles, and the menu tree they may see.
   *
   * Behaviour:
   * - Superadmin → all menus (with their permissions), unfiltered.
   * - Regular user → only menus whose `{slugName}.view` permission they hold;
   *   empty parent groups are pruned (see {@link AccessControlService.pruneEmptyGroups}).
   * - No roles and not superadmin → `{ canAccessAdmin: false, roles: [], menus: [] }`.
   *
   * @param authUserId - Better Auth user id.
   * @returns Object with `canAccessAdmin: boolean`, `roles: RoleSummary[]`
   *   (`id,name,code,description,isSystem,isActive`), and `menus: MenuNode[]`
   *   (nested tree; each node carries `id,name,code,route,iconName,type,
   *   sortOrder,parentId` and its `permissions[]`).
   */
  async getUserAccessControl(authUserId: string) {
    const userRoles = await this.userRoleRepo.find({
      where: { userId: authUserId },
      relations: { role: true },
    });

    const isSuper = await this.getSuperadminStatus(authUserId);
    const canAccessAdmin = isSuper || userRoles.length > 0;

    if (!canAccessAdmin) {
      return {
        canAccessAdmin: false,
        roles: [],
        menus: [],
      };
    }

    // Superadmin: lihat semua menu tanpa filter permission
    if (isSuper) {
      const allMenus = await this.menuRepo.find({
        relations: ['permissions'],
        where: { isActive: true },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });

      return {
        canAccessAdmin: true,
        roles: userRoles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          code: ur.role.code,
          description: ur.role.description,
          isSystem: ur.role.isSystem,
          isActive: ur.role.isActive,
        })),
        menus: buildTree(
          allMenus.map((m) => ({
            id: m.id,
            name: m.name,
            code: m.code,
            route: m.route,
            iconName: m.iconName,
            type: m.type,
            sortOrder: m.sortOrder,
            parentId: m.parentId,
            permissions: m.permissions.map((p) => ({
              id: p.id,
              name: p.name,
              code: p.code,
              description: p.description,
            })),
          })) as unknown as Parameters<typeof buildTree>[0],
        ),
      };
    }

    // Non-superadmin: filter by .view permission
    const permCodes = await this.getUserPermissionCodes(authUserId);
    const permCodeSet = new Set(permCodes);

    // Load all menus (flat)
    const allMenus = await this.menuRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    // Load user's permissions with menu relation — one query
    const userPerms = await this.permRepo.find({
      where: { code: In(permCodes) },
      relations: { menu: true },
    });

    // Build map: menuId → permissions[]
    const permsByMenuId = new Map<
      string,
      { id: string; name: string; code: string; description: string | null }[]
    >();
    for (const p of userPerms) {
      const mid = p.menuId ?? '';
      if (!permsByMenuId.has(mid)) {
        permsByMenuId.set(mid, []);
      }
      permsByMenuId.get(mid)!.push({
        id: p.id,
        name: p.name,
        code: p.code,
        description: p.description,
      });
    }

    // Filter menus: keep if menu has {slugName}.view permission (groups kept, pruned later)
    const visibleMenus = allMenus
      .filter((menu) => {
        if (menu.type === 'group') return true; // groups kept, children will prune later
        return permCodeSet.has(`${slugifyName(menu.name)}.view`);
      })
      .map((menu) => ({
        id: menu.id,
        name: menu.name,
        code: menu.code,
        route: menu.route,
        iconName: menu.iconName,
        type: menu.type,
        sortOrder: menu.sortOrder,
        parentId: menu.parentId,
        permissions: permsByMenuId.get(menu.id) ?? [],
      }));

    const tree = buildTree(visibleMenus);

    return {
      canAccessAdmin,
      roles: userRoles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        code: ur.role.code,
        description: ur.role.description,
        isSystem: ur.role.isSystem,
        isActive: ur.role.isActive,
      })),
      menus: this.pruneEmptyGroups(tree),
    };
  }

  /**
   * Recursively remove `group`-type menu nodes that have no visible children.
   * Walks the tree bottom-up (pruning children first), so a group whose only
   * visible descendants were filtered out is also dropped. Mutates `node.children`
   * in place and returns the filtered list.
   * @param nodes - Flat or nested menu nodes (each may carry a `children` array
   *   and a `type` of `'group' | 'menu'`).
   * @returns Same nodes with empty groups removed.
   */
  private pruneEmptyGroups(nodes: any[]): any[] {
    const result: any[] = [];
    for (const node of nodes) {
      if (node.children) {
        node.children = this.pruneEmptyGroups(node.children);
      }
      if (node.type === 'group' && node.children.length === 0) {
        continue; // drop empty groups
      }
      result.push(node);
    }
    return result;
  }
}

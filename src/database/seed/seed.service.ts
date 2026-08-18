import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuEntity } from '@module/access-control/entities/menu.entity';
import { PermissionEntity } from '@module/access-control/entities/permission.entity';
import { RoleEntity } from '@module/access-control/entities/role.entity';
import { RolePermissionEntity } from '@module/access-control/entities/role-permission.entity';
import { UserRoleEntity } from '@module/access-control/entities/user-role.entity';
import { UserEntity } from '@module/users/entities/user.entity';
import { auth } from '@lib/auth';
import { MENUS, PERMISSIONS } from './seed.constants';

export interface MenuSeed {
  name: string;
  code: string;
  route: string | null;
  iconName: string | null;
  type: 'group' | 'menu';
  sortOrder: number;
  isActive?: boolean;
  parentCode?: string;
}

export interface PermissionSeed {
  name: string;
  code: string;
  description: string;
  menuCode: string;
}

interface RoleSeed {
  name: string;
  code: string;
  isSystem: boolean;
  permissionCodes: string[];
}

const ALL_PERMISSION_CODES = PERMISSIONS.map((p) => p.code);

const ROLES: RoleSeed[] = [
  {
    name: 'Owner',
    code: 'owner',
    isSystem: true,
    permissionCodes: [
      'dashboard.view',
      'user.view',
      'user.create',
      'user.update',

      'menu.view',

      'role.view',

      'product.view',
      'product.create',
      'product.update',
      'product.delete',
    ],
  },
  {
    name: 'Admin',
    code: 'admin',
    isSystem: true,

    permissionCodes: ALL_PERMISSION_CODES,
  },
  {
    name: 'Staff Product',
    code: 'staff_product',
    isSystem: false,
    permissionCodes: ['product.view', 'product.create', 'product.update'],
  },
];

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(MenuEntity)
    private readonly menuRepo: Repository<MenuEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permRepo: Repository<PermissionEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermRepo: Repository<RolePermissionEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepo: Repository<UserRoleEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('Seeding database...');

    const menuMap = await this.seedMenus();
    await this.seedPermissions(menuMap);
    await this.seedRoles();
    await this.seedUserRoles();
    await this.seedSuperadmin();

    this.logger.log('Seeding complete.');
  }

  private async seedMenus(): Promise<Map<string, MenuEntity>> {
    const menuMap = new Map<string, MenuEntity>();

    // First pass: create root menus
    for (const seed of MENUS.filter((m) => !m.parentCode)) {
      const existing = await this.menuRepo.findOne({
        where: { code: seed.code },
      });
      if (existing) {
        menuMap.set(seed.code, existing);
        continue;
      }

      const menu = this.menuRepo.create({
        name: seed.name,
        code: seed.code,
        route: seed.route,
        iconName: seed.iconName,
        sortOrder: seed.sortOrder,
        type: seed.type,
        isActive: seed.isActive,
      });
      const saved = await this.menuRepo.save(menu);
      menuMap.set(seed.code, saved);
    }

    // Second pass: create child menus
    for (const seed of MENUS.filter((m) => m.parentCode)) {
      const existing = await this.menuRepo.findOne({
        where: { code: seed.code },
      });
      if (existing) {
        menuMap.set(seed.code, existing);
        continue;
      }

      const parent = menuMap.get(seed.parentCode!);
      const menu = this.menuRepo.create({
        name: seed.name,
        code: seed.code,
        route: seed.route,
        iconName: seed.iconName,
        sortOrder: seed.sortOrder,
        parentId: parent?.id,
        type: seed.type,
        isActive: seed.isActive,
      });
      const saved = await this.menuRepo.save(menu);
      menuMap.set(seed.code, saved);
    }

    return menuMap;
  }

  private async seedPermissions(
    menuMap: Map<string, MenuEntity>,
  ): Promise<void> {
    for (const seed of PERMISSIONS) {
      const existing = await this.permRepo.findOne({
        where: { code: seed.code },
      });
      if (existing) continue;

      const menu = menuMap.get(seed.menuCode);
      const perm = this.permRepo.create({
        name: seed.name,
        code: seed.code,
        description: seed.description,
        menuId: menu?.id,
      });
      await this.permRepo.save(perm);
    }
  }

  private async seedRoles(): Promise<void> {
    for (const seed of ROLES) {
      const existing = await this.roleRepo.findOne({
        where: { code: seed.code },
      });
      if (existing) continue;

      const role = this.roleRepo.create({
        name: seed.name,
        code: seed.code,
        isSystem: seed.isSystem,
      });
      const savedRole = await this.roleRepo.save(role);

      // Assign permissions
      for (const permCode of seed.permissionCodes) {
        const perm = await this.permRepo.findOne({ where: { code: permCode } });
        if (!perm) continue;

        const rolePerm = this.rolePermRepo.create({
          roleId: savedRole.id,
          permissionId: perm.id,
        });
        await this.rolePermRepo.save(rolePerm);
      }
    }
  }

  private async seedUserRoles(): Promise<void> {
    const users = await this.userRepo.find();
    if (users.length === 0) return;

    const staffRole = await this.roleRepo.findOne({
      where: { code: 'staff_product' },
    });

    for (const user of users) {
      // Superadmin users are roleless by design — the is_superadmin flag alone
      // grants full access via getUserPermissionCodes.
      if (user.isSuperadmin) continue;

      const existing = await this.userRoleRepo.findOne({
        where: { userId: user.id },
      });
      if (existing) continue;

      // Non-superadmin → Staff Product
      if (!staffRole) continue;

      await this.userRoleRepo.save(
        this.userRoleRepo.create({ userId: user.id, roleId: staffRole.id }),
      );
    }
  }

  /**
   * Create the bootstrap superadmin account via Better Auth sign-up.
   * The account is roleless — is_superadmin=true grants full access.
   * Idempotent: skips if the email already exists.
   * Credentials come from env: SEED_SUPERADMIN_EMAIL / _NAME / _PASSWORD.
   */
  private async seedSuperadmin(): Promise<void> {
    const email = process.env.SEED_SUPERADMIN_EMAIL?.trim();
    if (!email) {
      this.logger.warn(
        'SEED_SUPERADMIN_EMAIL not set — skipping superadmin seed',
      );
      return;
    }

    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      this.logger.debug(`Superadmin ${email} already exists — skipping`);
      return;
    }

    const name = process.env.SEED_SUPERADMIN_NAME?.trim() ?? 'Super Admin';
    const password = process.env.SEED_SUPERADMIN_PASSWORD;

    if (!password) {
      this.logger.warn(
        'SEED_SUPERADMIN_PASSWORD not set — skipping superadmin seed',
      );
      return;
    }

    const result = await auth.api.signUpEmail({
      body: { email, name, password },
    });

    if (!result?.user) {
      throw new Error('Failed to seed superadmin: Better Auth sign-up failed');
    }

    // Flag as superadmin (no role — flag alone grants full access)
    await this.userRepo.update(result.user.id, { isSuperadmin: true });

    this.logger.log(`Superadmin seeded: ${email}`);
  }
}

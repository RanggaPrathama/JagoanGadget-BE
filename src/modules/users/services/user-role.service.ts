import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PermissionCacheService } from '../../access-control/services/permission-cache.service';
import { RoleEntity } from '../../access-control/entities/role.entity';
import { UserRoleEntity } from '../../access-control/entities/user-role.entity';

@Injectable()
export class UserRoleService {
  constructor(
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepo: Repository<UserRoleEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    private readonly dataSource: DataSource,
    private readonly permissionCache: PermissionCacheService,
  ) {}

  async getUserRoles(userId: string): Promise<RoleEntity[]> {
    const userRoles = await this.userRoleRepo.find({
      where: { userId },
      relations: ['role'],
    });

    return userRoles.map((ur) => ur.role);
  }

  async setUserRoles(userId: string, roleIds: string[]): Promise<void> {
    for (const roleId of roleIds) {
      const role = await this.roleRepo.findOne({ where: { id: roleId } });
      if (!role) {
        throw new NotFoundException(`Role with id "${roleId}" not found`);
      }
      if (!role.isActive) {
        throw new BadRequestException(
          `Role "${role.name}" is inactive and cannot be assigned`,
        );
      }
    }

    // Get current roles before replacement (for tracking index diff)
    const currentUserRoles = await this.userRoleRepo.find({
      where: { userId },
      select: ['roleId'],
    });
    const currentRoleIds = currentUserRoles.map((ur) => ur.roleId);

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(UserRoleEntity, { userId });

      if (roleIds.length > 0) {
        const entities = roleIds.map((roleId) =>
          manager.create(UserRoleEntity, { userId, roleId }),
        );
        await manager.save(UserRoleEntity, entities);
      }
    });

    // Update role-to-user tracking index
    const rolesAdded = roleIds.filter((id) => !currentRoleIds.includes(id));
    const rolesRemoved = currentRoleIds.filter((id) => !roleIds.includes(id));

    const trackingOps = [
      ...rolesAdded.map((roleId) =>
        this.permissionCache.trackUserRole(userId, roleId),
      ),
      ...rolesRemoved.map((roleId) =>
        this.permissionCache.untrackUserRole(userId, roleId),
      ),
    ];

    await Promise.all(trackingOps);
    await this.permissionCache.invalidate(userId);
  }
}

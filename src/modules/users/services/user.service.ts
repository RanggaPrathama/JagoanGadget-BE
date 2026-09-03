import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { auth } from '@lib/auth';
import {
  buildPaginationParams,
  PaginatedResult,
} from '../../../common/helpers/pagination.helper';
import { UserEntity } from '../entities/user.entity';
import { UserRoleService } from './user-role.service';
import { PermissionCacheService } from '../../access-control/services/permission-cache.service';
import { CreateUserDto } from '../dto/user/create-user.dto';
import { UpdateUserDto } from '../dto/user/update-user.dto';
import { QueryUserDto } from '../dto/user/query-user.dto';
import { UserStatisticsResponseDto } from '../dto/user/user-statistics.response.dto';
import { TempFileService } from '../../uploads/services/temp-file.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly userRoleService: UserRoleService,
    private readonly permissionCache: PermissionCacheService,
    private readonly tempFileService: TempFileService,
  ) {}

  async findAll(query: QueryUserDto): Promise<PaginatedResult<UserEntity>> {
    const { page, limit, skip, search, noPagination } =
      buildPaginationParams(query);

    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role');

    if (search) {
      qb.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (query.isActive !== undefined && query.isActive !== null) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive });
    }

    if (query.isSuperadmin !== undefined && query.isSuperadmin !== null) {
      qb.andWhere('user.isSuperadmin = :isSuperadmin', {
        isSuperadmin: query.isSuperadmin,
      });
    }

    if (query.roleId) {
      qb.andWhere('role.id = :roleId', { roleId: query.roleId });
    }

    qb.orderBy('user.createdAt', 'DESC');

    if (!noPagination) {
      qb.skip(skip).take(limit);
    }

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    return user;
  }

  async getStatistics(): Promise<UserStatisticsResponseDto> {
    const stats = await this.userRepo
      .createQueryBuilder('user')
      .select('COUNT(*)', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE user.isActive = true)`, 'active')
      .addSelect(`COUNT(*) FILTER (WHERE user.isActive = false)`, 'inactive')
      .addSelect(
        `COUNT(*) FILTER (WHERE user.isSuperadmin = true)`,
        'superAdmin',
      )
      .getRawOne();

    return {
      totalUsers: parseInt(stats.total, 10),
      totalActiveUsers: parseInt(stats.active, 10),
      totalInactiveUsers: parseInt(stats.inactive, 10),
      totalSuperAdmins: parseInt(stats.superAdmin, 10),
    };
  }

  async create(dto: CreateUserDto): Promise<UserEntity> {
    // Check email uniqueness
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException(
        `User with email "${dto.email}" already exists`,
      );
    }

    // Create Better Auth user (generates ID + hashes password + creates account)
    const result = await auth.api.signUpEmail({
      body: {
        email: dto.email,
        password: dto.password,
        name: dto.name,
      },
    });

    if (!result || !result.user) {
      throw new BadRequestException('Failed to create user via auth');
    }

    const authUserId = result.user.id;

    // Promote a staged temp avatar file if provided (file already uploaded via presigned URL)
    let avatarUrl: string | null = dto.avatarUrl ?? null;
    if (dto.avatarTempKey !== undefined) {
      avatarUrl = await this.tempFileService.promote(dto.avatarTempKey);
    }

    // Update app-specific fields on the created user record
    await this.userRepo.update(authUserId, {
      phoneNumber: dto.phoneNumber ?? null,
      avatarUrl,
      isSuperadmin: dto.isSuperadmin ?? false,
      isActive: true,
    });

    // Assign roles if provided
    if (dto.roleIds && dto.roleIds.length > 0) {
      await this.userRoleService.setUserRoles(authUserId, dto.roleIds);
    }

    this.logger.log(`User created: ${authUserId} (${dto.email})`);

    return this.findOne(authUserId);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findOne(id);

    // Check email uniqueness if changed
    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepo.findOne({
        where: { email: dto.email },
      });
      if (existing) {
        throw new BadRequestException(
          `User with email "${dto.email}" already exists`,
        );
      }
    }

    // Update fields (only override if explicitly provided in dto)
    const { phoneNumber, avatarUrl, isSuperadmin, avatarTempKey, ...rest } =
      dto;
    Object.assign(user, {
      ...rest,
      ...(phoneNumber !== undefined && { phoneNumber }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      ...(isSuperadmin !== undefined && { isSuperadmin }),
    });

    // Promote a staged temp avatar file to its final location
    const oldAvatarUrl = user.avatarUrl;
    if (avatarTempKey !== undefined) {
      user.avatarUrl = await this.tempFileService.promote(avatarTempKey);
    }

    const savedUser = await this.userRepo.save(user);

    // Delete the old avatar file after the DB row has been updated
    if (oldAvatarUrl && avatarTempKey !== undefined) {
      try {
        const oldAvatarKey =
          this.tempFileService.urlToRelativePath(oldAvatarUrl);
        await this.tempFileService.deleteByRelativePath(oldAvatarKey);
      } catch {
        this.logger.warn(
          `Old avatar cleanup skipped for user ${id}: ${oldAvatarUrl}`,
        );
      }
    }

    // Invalidate permission cache if superadmin status changed
    if (isSuperadmin !== undefined && isSuperadmin !== user.isSuperadmin) {
      await this.permissionCache.invalidate(id);
    }

    // Re-fetch with relations
    const updatedUser = await this.findOne(savedUser.id);

    // Reassign roles if provided
    if (dto.roleIds !== undefined) {
      await this.userRoleService.setUserRoles(id, dto.roleIds);
      return this.findOne(id);
    }

    return updatedUser;
  }

  /*
   ** Delete a user by ID.
   ** Throws NotFoundException if the user does not exist.
   */
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    // delete the user's avatar file after the DB row has been deleted
    if (user.avatarUrl) {
      try {
        const avatarKey = this.tempFileService.urlToRelativePath(
          user.avatarUrl,
        );
        await this.tempFileService.deleteByRelativePath(avatarKey);
      } catch {
        this.logger.warn(
          `Failed to delete avatar for user ${id}: ${user.avatarUrl}`,
        );
      }
    }
    await this.userRepo.remove(user);
    this.logger.log(`User deleted: ${id} (${user.email})`);
  }
}

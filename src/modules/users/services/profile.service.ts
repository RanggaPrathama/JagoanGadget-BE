import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { UpdateProfileDto } from '../dto/profile/update-profile.dto';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { TempFileService } from '../../uploads/services/temp-file.service';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly accessControl: AccessControlService,
    private readonly tempFileService: TempFileService,
  ) {}

  async getProfile(authUserId: string) {
    const [user, accessControl] = await Promise.all([
      this.userRepo.findOneOrFail({ where: { id: authUserId } }),
      this.accessControl.getUserAccessControl(authUserId),
    ]);

    return { user, accessControl };
  }

  async updateProfile(authUserId: string, dto: UpdateProfileDto) {
    const { avatarTempKey, ...rest } = dto;

    const user = await this.userRepo.findOneOrFail({
      where: { id: authUserId },
    });

    if (avatarTempKey !== undefined) {
      const oldAvatarUrl = user.avatarUrl;
      user.avatarUrl = await this.tempFileService.promote(avatarTempKey);
      await this.userRepo.save(user);

      if (oldAvatarUrl) {
        try {
          const oldAvatarKey =
            this.tempFileService.urlToRelativePath(oldAvatarUrl);
          await this.tempFileService.deleteByRelativePath(oldAvatarKey);
        } catch {
          this.logger.warn(
            `Old avatar cleanup skipped for user ${authUserId}: ${oldAvatarUrl}`,
          );
        }
      }
    }

    // Filter out class-transformer's undefined properties before update.
    const updateValues = Object.fromEntries(
      Object.entries(rest).filter(([, value]) => value !== undefined),
    );
    if (Object.keys(updateValues).length > 0) {
      await this.userRepo.update(authUserId, updateValues);
    }
    return this.userRepo.findOneOrFail({ where: { id: authUserId } });
  }
}

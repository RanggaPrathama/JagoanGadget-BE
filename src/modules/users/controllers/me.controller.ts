import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { ProfileService } from '../services/profile.service';
import { UpdateProfileDto } from '../dto/profile/update-profile.dto';
import { responseSuccess } from '@common/helpers/response.helper';

@ApiTags('Me')
@ApiBearerAuth('bearerAuth')
@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('/')
  async getProfile(@Session() session: UserSession) {
    const profile = await this.profileService.getProfile(session.user.id);
    return responseSuccess(true, 'Profile retrieved successfully', profile);
  }

  @Put('/update-profile')
  async updateProfile(
    @Session() session: UserSession,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.profileService.updateProfile(session.user.id, dto);
    return responseSuccess(true, 'Profile updated successfully', user);
  }
}

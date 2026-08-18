import { OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { AVATAR_TEMP_KEY_REGEX } from '../../../uploads/uploads.constants';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {
  /**
   * Reference to a previously staged temp avatar file
   * (`temp/avatar/{uuid}.{ext}`). If provided, the temp file is promoted to
   * its final public location and `avatarUrl` is overwritten.
   */
  @IsOptional()
  @IsString()
  @Matches(AVATAR_TEMP_KEY_REGEX, {
    message: 'avatarTempKey must be a valid temp/avatar/... key',
  })
  avatarTempKey?: string;
}

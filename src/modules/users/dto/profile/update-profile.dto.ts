import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { AVATAR_TEMP_KEY_REGEX } from '../../../uploads/uploads.constants';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  avatarUrl?: string;

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

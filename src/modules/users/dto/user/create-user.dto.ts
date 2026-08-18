import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { AVATAR_TEMP_KEY_REGEX } from '../../../uploads/uploads.constants';

export class CreateUserDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({
    description: 'User email address (unique)',
    example: 'john@example.com',
    maxLength: 255,
  })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    description: 'User password (min 8 chars)',
    example: 'SecureP@ss123',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @Length(8, 128)
  password!: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+6281234567890',
    maxLength: 30,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string | null;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
    maxLength: 255,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  avatarUrl?: string | null;

  @ApiPropertyOptional({
    description:
      'Reference to a staged temp avatar file (temp/avatar/{uuid}.{ext}). If provided, the temp file is promoted to its final public location and avatarUrl is set.',
    example: 'temp/avatar/9f01239f-a6ee-4b5b-b302-85bed9120e0d.png',
  })
  @IsOptional()
  @IsString()
  @Matches(AVATAR_TEMP_KEY_REGEX, {
    message: 'avatarTempKey must be a valid temp/avatar/... key',
  })
  avatarTempKey?: string;

  @ApiPropertyOptional({
    description: 'Grant superadmin privileges',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isSuperadmin?: boolean;

  @ApiPropertyOptional({
    description: 'Set user as active or inactive',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Role IDs to assign',
    example: ['uuid-role-1', 'uuid-role-2'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];
}

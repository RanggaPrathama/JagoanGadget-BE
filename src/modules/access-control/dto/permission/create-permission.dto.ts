import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({
    description: 'Permission display name',
    example: 'Create Menu',
    minLength: 1,
    maxLength: 150,
    required: true,
  })
  @IsString()
  @Length(1, 150)
  name: string;

  @ApiProperty({
    description: 'Unique permission code (dot notation)',
    example: 'menu.create',
    minLength: 1,
    maxLength: 100,
    required: true,
  })
  @IsString()
  @Length(1, 100)
  code: string;

  @ApiProperty({
    description: 'Permission description',
    example: 'Ability to create new menus',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({
    description: 'Associated menu UUID',
    example: 'uuid-menu-id',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  menuId?: string | null;
}

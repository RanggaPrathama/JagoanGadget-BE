import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class CreateMenuDto {
  @ApiProperty({
    description: 'Menu display name',
    example: 'Dashboard',
    minLength: 1,
    maxLength: 100,
    required: true,
  })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({
    description: 'Unique menu code identifier',
    example: 'dashboard',
    minLength: 1,
    maxLength: 100,
    required: true,
  })
  @IsString()
  @Length(1, 100)
  code!: string;

  @ApiProperty({
    description: 'Route path for navigation',
    example: '/admin/dashboard',
    maxLength: 255,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  route?: string | null;

  @ApiProperty({
    description: 'Icon component/class name',
    example: 'LayoutDashboard',
    maxLength: 100,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  iconName?: string | null;

  @ApiProperty({
    description: 'Sort order (lower = first)',
    example: 1,
    default: 0,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({
    description: 'Menu type',
    example: 'menu',
    enum: ['menu', 'group'],
    required: true,
  })
  @IsString()
  type!: 'menu' | 'group';

  @ApiProperty({
    description: 'Whether menu is active/visible',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Parent menu UUID (null = root menu)',
    example: 'uuid-parent-id',
    required: false,
    nullable: true,
  })
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}

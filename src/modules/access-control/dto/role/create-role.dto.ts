import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Role display name',
    example: 'Administrator',
    minLength: 1,
    maxLength: 100,
    required: true,
  })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({
    description: 'Unique role code identifier',
    example: 'admin',
    minLength: 1,
    maxLength: 100,
    required: true,
  })
  @IsString()
  @Length(1, 100)
  code!: string;

  @ApiProperty({
    description: 'Role description',
    example: 'Full system access',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({
    description: 'Whether this is a system role (cannot be deleted)',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiProperty({
    description: 'Whether role is active',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Array of permission UUIDs to assign to the role',
    example: ['uuid-permission-1', 'uuid-permission-2'],
    required: false,
    type: 'array',
    items: { type: 'string', format: 'uuid' },
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayUnique({ message: 'permissionIds must not contain duplicate values' })
  permissionIds?: string[];
}

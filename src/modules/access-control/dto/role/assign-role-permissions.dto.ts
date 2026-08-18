import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class AssignRolePermissionsDto {
  @ApiProperty({
    description: 'Array of permission UUIDs to assign to the role',
    example: ['uuid-permission-1', 'uuid-permission-2'],
    required: true,
    type: 'array',
    items: { type: 'string', format: 'uuid' },
  })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}

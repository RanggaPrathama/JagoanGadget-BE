import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class AssignUserRolesDto {
  @ApiProperty({
    description: 'Array of role UUIDs to assign to the user',
    example: ['uuid-role-1', 'uuid-role-2'],
    required: true,
    type: 'array',
    items: { type: 'string', format: 'uuid' },
  })
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds: string[];
}

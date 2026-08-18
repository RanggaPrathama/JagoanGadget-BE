import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class QueryPermissionDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Comma-separated menu IDs to filter permissions by associated menus.',
    example: 'uuid1,uuid2',
  })
  @IsOptional()
  @IsString()
  menuIds?: string;
}

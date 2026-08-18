import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

export enum ShowFilter {
  ALL = 'all',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}
export class PaginationQueryMenuDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: true,
    description:
      'Filter menus by active status. If true, only active menus will be returned. If false, only inactive menus will be returned. If not provided, all menus will be returned.',
  })
  @IsOptional()
  show?: ShowFilter;

  @ApiPropertyOptional({
    example: true,
    description:
      'If true, only menus with associated permissions will be returned. If false or omitted, all menus will be returned regardless of permission association.',
  })
  @IsOptional()
  @Transform(({ obj }) => {
    // Read raw from obj to skip implicit conversion: Boolean("false") → true
    const raw = obj?.['hasPermission'];
    if (raw === undefined || raw === null) return undefined;
    return raw === 'true' || raw === true;
  })
  hasPermission?: boolean;
}

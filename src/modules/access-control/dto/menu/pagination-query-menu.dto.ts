import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class PaginationQueryMenuDto extends PaginationQueryDto {
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

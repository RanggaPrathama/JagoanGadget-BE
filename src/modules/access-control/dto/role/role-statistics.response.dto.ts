import { ApiProperty } from '@nestjs/swagger';

export class RoleStatisticsResponseDto {
  @ApiProperty({ example: 150 })
  totalRole!: number;

  @ApiProperty({ example: 120 })
  totalActiveRole!: number;

  @ApiProperty({ example: 30 })
  totalInactiveRole!: number;
}

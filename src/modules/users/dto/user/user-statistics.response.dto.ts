import { ApiProperty } from '@nestjs/swagger';

export class UserStatisticsResponseDto {
  @ApiProperty({ example: 150 })
  totalUsers!: number;

  @ApiProperty({ example: 120 })
  totalActiveUsers!: number;

  @ApiProperty({ example: 30 })
  totalInactiveUsers!: number;

  @ApiProperty({ example: 3 })
  totalSuperAdmins!: number;
}

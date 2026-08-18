import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'WH1' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 'Main Warehouse' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ required: false, nullable: true, example: 'Jl. Industri 1' })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

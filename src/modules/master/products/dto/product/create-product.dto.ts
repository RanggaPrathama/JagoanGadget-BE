import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { CreateSkuDto } from './create-sku.dto';

export class CreateProductDto {
  @ApiProperty({ required: false, nullable: true, example: '0a1b2c3d-...' })
  @IsOptional()
  @IsUUID()
  brandId?: string | null;

  @ApiProperty({ example: '0e1f2a3b-...' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ example: 'ASUS Zenbook 14 OLED (UX3405)' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: [CreateSkuDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSkuDto)
  skus!: CreateSkuDto[];
}

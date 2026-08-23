import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateProductImageDto } from './create-product-image.dto';
import { CreateSkuAttributeValueDto } from './create-sku-attribute-value.dto';

export class CreateSkuDto {
  @ApiProperty({ example: 'UX3405-U7-32-512-SLV' })
  @IsString()
  @MaxLength(100)
  skuCode!: string;

  @ApiProperty({ example: 'Core Ultra 7 / 32GB / Foggy Silver' })
  @IsString()
  @MaxLength(150)
  variantName!: string;

  /** numeric(19,2); arrives as number from client, persisted as string. */
  @ApiProperty({ example: 12999000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @ApiProperty({ required: false, type: [CreateProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];

  @ApiProperty({ type: [CreateSkuAttributeValueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSkuAttributeValueDto)
  attributeValues!: CreateSkuAttributeValueDto[];
}

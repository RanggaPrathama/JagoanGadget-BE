import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AttributeDataType } from '../../entities/attribute.entity';

export class CreateAttributeDto {
  @ApiProperty({ example: 'RAM' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    enum: AttributeDataType,
    default: AttributeDataType.STRING,
    example: AttributeDataType.STRING,
  })
  @IsOptional()
  @IsEnum(AttributeDataType)
  dataType?: AttributeDataType;
}

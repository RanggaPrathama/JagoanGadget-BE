import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SegmentDto } from './segment.dto';

export class CreateNumberFormatDto {
  @ApiProperty({
    description: 'Linked menu UUID (optional). Enforces 1 format per menu.',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  menuId?: string | null;

  @ApiProperty({
    description: 'Ordered segments that compose the format.',
    type: [SegmentDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SegmentDto)
  segments!: SegmentDto[];

  @ApiProperty({
    description: 'Whether this format is active',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Length } from 'class-validator';
import { SegmentType } from '@module/master/numbering/entities/number_format_d.entity';

/** One ordered part of a number format: a literal or a prefix reference. */
export class SegmentDto {
  @ApiProperty({
    description:
      'LITERAL = fixed text (e.g. "INV", "-"); PREFIX = reference to a prefix master entry (e.g. "seq", "year").',
    enum: SegmentType,
    example: SegmentType.PREFIX,
  })
  @IsIn(Object.values(SegmentType))
  type!: SegmentType;

  @ApiProperty({
    description: 'Literal text. Required when type=LITERAL.',
    example: 'INV',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  value?: string | null;

  @ApiProperty({
    description: 'PrefixEntity.name. Required when type=PREFIX.',
    example: 'seq',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  prefixName?: string | null;

  @ApiProperty({
    description: 'Order of the segment within the format (0-based).',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  index!: number;
}

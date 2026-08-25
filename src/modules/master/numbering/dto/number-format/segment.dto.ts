import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

/** One ordered part of a number format: a reference to a prefix master entry. */
export class SegmentDto {
  @ApiProperty({
    description:
      'PrefixEntity UUID. Literal text is modeled as a prefix of type TEXT.',
    format: 'uuid',
  })
  @IsUUID()
  prefixId!: string;

  @ApiProperty({
    description: 'Order of the segment within the format (0-based).',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  index!: number;
}

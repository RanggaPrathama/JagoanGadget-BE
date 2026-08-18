import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Smart Phone' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'URL-safe slug. Auto-generated from name when omitted.',
    example: 'smart-phone',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  slug?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Parent category id (UUID) for sub-categories. Null = root.',
    example: '0c9c2c9a-...',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}

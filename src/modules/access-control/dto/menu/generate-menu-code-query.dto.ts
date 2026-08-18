import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class GenerateMenuCodeQueryDto {
  @ApiProperty({
    description: 'Menu name to generate code from',
    example: 'User Management',
    minLength: 1,
    maxLength: 100,
    required: true,
  })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({
    description: 'Parent menu UUID (null or empty for root menu)',
    example: 'uuid-parent-id',
    required: false,
    nullable: true,
  })
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}

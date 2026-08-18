import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { TypePrefix } from '@module/master/numbering/entities/prefix.entity';

export class CreatePrefixDto {
  @ApiProperty({
    description: 'Prefix name / token, e.g. "seq", "year"',
    example: 'seq',
    minLength: 1,
    maxLength: 30,
  })
  @IsString()
  @Length(1, 30)
  name!: string;

  @ApiProperty({
    description:
      'Current value (for sequence: last used number; for text: literal; for date types: format)',
    example: '0001',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @Length(1, 50)
  value!: string;

  @ApiProperty({
    description: 'Prefix type',
    enum: TypePrefix,
    example: TypePrefix.SEQUENCE,
  })
  @IsIn(Object.values(TypePrefix))
  type!: TypePrefix;

  @ApiProperty({
    description: 'Whether active',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

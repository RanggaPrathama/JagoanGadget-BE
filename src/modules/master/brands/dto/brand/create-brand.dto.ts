import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Acme' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'https://cdn/x.png',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  logoUrl?: string | null;
}

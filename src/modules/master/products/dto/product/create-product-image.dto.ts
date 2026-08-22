import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';

export class CreateProductImageDto {
  @ApiProperty({ example: 'https://cdn.example.com/img.jpg' })
  @IsString()
  @MaxLength(1024)
  imageUrl!: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

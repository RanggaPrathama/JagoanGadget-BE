import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateSkuAttributeValueDto {
  /** References an EXISTING attribute in the global catalog (no ad-hoc key creation). */
  @ApiProperty({ example: '0c1d2e3f-...' })
  @IsUUID()
  attributeId!: string;

  @ApiProperty({ example: '32GB' })
  @IsString()
  @MaxLength(255)
  value!: string;
}

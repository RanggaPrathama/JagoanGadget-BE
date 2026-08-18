import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { UPLOAD_PURPOSES } from '../uploads.constants';
import type { UploadPurpose } from '../uploads.constants';

export class PresignDto {
  @IsIn(UPLOAD_PURPOSES)
  purpose!: UploadPurpose;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  filename?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  maxBytes?: number;
}

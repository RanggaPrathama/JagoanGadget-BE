import { PartialType } from '@nestjs/swagger';
import { CreateNumberFormatDto } from './create-number-format.dto';

export class UpdateNumberFormatDto extends PartialType(CreateNumberFormatDto) {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NumberFormatEntity } from './entities/number_format.entity';
import { NumberFormatSegmentEntity } from './entities/number_format_d.entity';
import { PrefixEntity } from './entities/prefix.entity';
import { NumberingService } from './services/numbering.service';
import { PrefixService } from './services/prefix.service';
import { NumberingController } from './controllers/numbering.controller';
import { PrefixController } from './controllers/prefix.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NumberFormatEntity,
      NumberFormatSegmentEntity,
      PrefixEntity,
    ]),
  ],
  controllers: [NumberingController, PrefixController],
  providers: [NumberingService, PrefixService],
  exports: [TypeOrmModule, NumberingService, PrefixService],
})
export class NumberFormatModule {}

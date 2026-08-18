import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { PermissionGuard } from '@common/guards/permission.guard';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { responseSuccess } from '@common/helpers/response.helper';
import { buildPaginationMeta } from '@common/helpers/pagination.helper';
import { NumberingService } from '../services/numbering.service';
import { PaginationQueryNumberFormatDto } from '../dto/number-format/pagination-query-number-format.dto';
import { CreateNumberFormatDto } from '../dto/number-format/create-number-format.dto';
import { UpdateNumberFormatDto } from '../dto/number-format/update-number-format.dto';

@ApiTags('Admin - Number Formats')
@Controller('admin/number-formats')
@UseGuards(AuthGuard, PermissionGuard)
export class NumberingController {
  constructor(private readonly service: NumberingService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(@Query() query: PaginationQueryNumberFormatDto) {
    const result = await this.service.findAll(query);
    if (query.no_pagination)
      return responseSuccess(true, 'Number formats retrieved', result.items);
    return responseSuccess(
      true,
      'Number formats retrieved',
      result.items,
      buildPaginationMeta(result),
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return responseSuccess(
      true,
      'Number format retrieved',
      await this.service.findOne(id),
    );
  }

  @Post()
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('number-format.create')
  async create(@Body() dto: CreateNumberFormatDto) {
    return responseSuccess(
      true,
      'Number format created',
      await this.service.create(dto),
    );
  }

  @Put(':id')
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('number-format.update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNumberFormatDto,
  ) {
    return responseSuccess(
      true,
      'Number format updated',
      await this.service.update(id, dto),
    );
  }

  @Delete(':id')
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('number-format.delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
    return responseSuccess(true, 'Number format deleted');
  }

  @Post(':id/generate-next')
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('number-format.update')
  async generateNext(@Param('id', ParseUUIDPipe) id: string) {
    return responseSuccess(
      true,
      'Number generated',
      await this.service.generateNext(id),
    );
  }
}

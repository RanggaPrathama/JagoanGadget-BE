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
import { PrefixService } from '../services/prefix.service';
import { PaginationQueryPrefixDto } from '../dto/prefix/pagination-query-prefix.dto';
import { CreatePrefixDto } from '../dto/prefix/create-prefix.dto';
import { UpdatePrefixDto } from '../dto/prefix/update-prefix.dto';

@ApiTags('Admin - Prefixes')
@Controller('admin/prefixes')
@UseGuards(AuthGuard, PermissionGuard)
export class PrefixController {
  constructor(private readonly service: PrefixService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(@Query() query: PaginationQueryPrefixDto) {
    const result = await this.service.findAll(query);
    if (query.no_pagination)
      return responseSuccess(true, 'Prefixes retrieved', result.items);
    return responseSuccess(
      true,
      'Prefixes retrieved',
      result.items,
      buildPaginationMeta(result),
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return responseSuccess(
      true,
      'Prefix retrieved',
      await this.service.findOne(id),
    );
  }

  @Post()
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('prefix.create')
  async create(@Body() dto: CreatePrefixDto) {
    return responseSuccess(
      true,
      'Prefix created',
      await this.service.create(dto),
    );
  }

  @Put(':id')
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('prefix.update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePrefixDto,
  ) {
    return responseSuccess(
      true,
      'Prefix updated',
      await this.service.update(id, dto),
    );
  }

  @Delete(':id')
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('prefix.delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
    return responseSuccess(true, 'Prefix deleted');
  }
}

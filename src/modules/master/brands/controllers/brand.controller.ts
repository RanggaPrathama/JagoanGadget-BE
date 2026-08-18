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
import { BrandService } from '../services/brand.service';
import { PaginationQueryBrandDto } from '../dto/brand/pagination-query-brand.dto';
import { CreateBrandDto } from '../dto/brand/create-brand.dto';
import { UpdateBrandDto } from '../dto/brand/update-brand.dto';

@ApiTags('Admin - Brands')
@Controller('admin/brands')
@UseGuards(AuthGuard, PermissionGuard)
export class BrandController {
  constructor(private readonly service: BrandService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(@Query() query: PaginationQueryBrandDto) {
    const result = await this.service.findAll(query);
    if (query.no_pagination)
      return responseSuccess(true, 'Brands retrieved', result.items);
    return responseSuccess(
      true,
      'Brands retrieved',
      result.items,
      buildPaginationMeta(result),
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return responseSuccess(
      true,
      'Brand retrieved',
      await this.service.findOne(id),
    );
  }

  @Post()
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('brand.create')
  async create(@Body() dto: CreateBrandDto) {
    return responseSuccess(
      true,
      'Brand created',
      await this.service.create(dto),
    );
  }

  @Put(':id')
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('brand.update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBrandDto,
  ) {
    return responseSuccess(
      true,
      'Brand updated',
      await this.service.update(id, dto),
    );
  }

  @Delete(':id')
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('brand.delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
    return responseSuccess(true, 'Brand deleted');
  }
}

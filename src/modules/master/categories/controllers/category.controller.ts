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
import { CategoryService } from '../services/category.service';
import { PaginationQueryCategoryDto } from '../dto/category/pagination-query-category.dto';
import { CreateCategoryDto } from '../dto/category/create-category.dto';
import { UpdateCategoryDto } from '../dto/category/update-category.dto';

@ApiTags('Admin - Categories')
@Controller('admin/categories')
@UseGuards(AuthGuard, PermissionGuard)
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(@Query() query: PaginationQueryCategoryDto) {
    const result = await this.service.findAll(query);
    if (query.no_pagination)
      return responseSuccess(true, 'Categories retrieved', result.items);
    return responseSuccess(
      true,
      'Categories retrieved',
      result.items,
      buildPaginationMeta(result),
    );
  }

  @Get('tree')
  async findTree() {
    return responseSuccess(
      true,
      'Category tree retrieved',
      await this.service.findTree(),
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return responseSuccess(
      true,
      'Category retrieved',
      await this.service.findOne(id),
    );
  }

  @Post()
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('category.create')
  async create(@Body() dto: CreateCategoryDto) {
    return responseSuccess(
      true,
      'Category created',
      await this.service.create(dto),
    );
  }

  @Put(':id')
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('category.update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return responseSuccess(
      true,
      'Category updated',
      await this.service.update(id, dto),
    );
  }

  @Delete(':id')
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('category.delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
    return responseSuccess(true, 'Category deleted');
  }
}

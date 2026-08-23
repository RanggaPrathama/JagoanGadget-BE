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
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { PermissionGuard } from '@common/guards/permission.guard';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { responseSuccess } from '@common/helpers/response.helper';
import { buildPaginationMeta } from '@common/helpers/pagination.helper';
import { ProductService } from '../services/product.service';
import { CreateProductDto } from '../dto/product/create-product.dto';
import { UpdateProductDto } from '../dto/product/update-product.dto';
import { PaginationQueryProductDto } from '../dto/product/pagination-query-product.dto';

@ApiTags('Admin - Products')
@Controller('admin/products')
@UseGuards(AuthGuard, PermissionGuard)
export class ProductAdminController {
  constructor(private readonly service: ProductService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'show',
    required: false,
    type: String,
    enum: ['active', 'inactive'],
  })
  async findAll(@Query() query: PaginationQueryProductDto) {
    const result = await this.service.findAll(query, false);
    return responseSuccess(
      true,
      'Products retrieved',
      result.items,
      query.no_pagination ? null : buildPaginationMeta(result),
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return responseSuccess(
      true,
      'Product retrieved',
      await this.service.findOne(id),
    );
  }

  @Post()
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('product.create')
  async create(@Body() dto: CreateProductDto) {
    return responseSuccess(
      true,
      'Product created',
      await this.service.createProduct(dto),
    );
  }

  @Put(':id')
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('product.update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return responseSuccess(
      true,
      'Product updated',
      await this.service.update(id, dto),
    );
  }

  @Delete(':id')
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('product.delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
    return responseSuccess(true, 'Product deleted', null);
  }
}

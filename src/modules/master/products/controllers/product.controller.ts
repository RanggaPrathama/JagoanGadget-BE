import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { responseSuccess } from '@common/helpers/response.helper';
import { buildPaginationMeta } from '@common/helpers/pagination.helper';
import { ProductService } from '../services/product.service';
import { PaginationQueryProductDto } from '../dto/product/pagination-query-product.dto';

@ApiTags('Storefront - Products')
@Controller('products')
export class ProductController {
  constructor(private readonly service: ProductService) {}

  /** Public catalog listing with min/max price range. */
  @Get()
  @AllowAnonymous()
  async findAll(@Query() query: PaginationQueryProductDto) {
    const result = await this.service.findAll(query, true);
    const priceRange = await this.service.getMinMaxPrice({
      isActive: true,
      search: query.search,
    });
    return responseSuccess(
      true,
      'Products retrieved',
      { items: result.items, priceRange },
      query.no_pagination ? null : buildPaginationMeta(result),
    );
  }

  /** Public product detail (PDP) by slug — full SKU matrix. */
  @Get(':slug')
  @AllowAnonymous()
  async findBySlug(@Param('slug') slug: string) {
    return responseSuccess(
      true,
      'Product retrieved',
      await this.service.findOneBySlug(slug, true),
    );
  }
}

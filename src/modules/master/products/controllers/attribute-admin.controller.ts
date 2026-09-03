import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { PermissionGuard } from '@common/guards/permission.guard';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { responseSuccess } from '@common/helpers/response.helper';
import { buildPaginationMeta } from '@common/helpers/pagination.helper';
import { AttributeService } from '../services/attribute.service';
import { CreateAttributeDto } from '../dto/attribute/create-attribute.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

@ApiTags('Admin - Attributes')
@Controller('admin/attributes')
@UseGuards(AuthGuard, PermissionGuard)
export class AttributeAdminController {
  constructor(private readonly service: AttributeService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.service.findAll(query);
    if (query.no_pagination)
      return responseSuccess(true, 'Attributes retrieved', result.items);
    return responseSuccess(
      true,
      'Attributes retrieved',
      result.items,
      buildPaginationMeta(result),
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return responseSuccess(
      true,
      'Attribute retrieved',
      await this.service.findOne(id),
    );
  }

  @Post()
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('product.create')
  async create(@Body() dto: CreateAttributeDto) {
    return responseSuccess(
      true,
      'Attribute created',
      await this.service.create(dto),
    );
  }

  @Delete(':id')
  @ApiBearerAuth('bearerAuth')
  @RequirePermission('product.delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
    return responseSuccess(true, 'Attribute deleted');
  }
}

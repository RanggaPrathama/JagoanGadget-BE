import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { QueryPermissionDto } from '../dto/permission/query-permission.dto';
import { buildPaginationMeta } from '@common/helpers/pagination.helper';
import { responseSuccess } from '@common/helpers/response.helper';
import { CreatePermissionDto } from '../dto/permission/create-permission.dto';
import { UpdatePermissionDto } from '../dto/permission/update-permission.dto';
import { PermissionService } from '../../access-control/services/permission.service';
@ApiTags('Admin - Permissions')
@Controller('admin/permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  /**
   * GET /admin/permissions — paginated permission list (supports `search`, `menuIds` CSV).
   * @returns `responseSuccess` with `data: PermissionEntity[]` and pagination meta (unless `no_pagination`).
   */
  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'menuIds',
    required: false,
    type: [String],
    description:
      'Filter permissions by associated menu IDs. Provide a comma-separated list of menu IDs to filter permissions that are linked to those menus.',
  })
  async findAll(@Query() query: QueryPermissionDto) {
    const result = await this.permissionService.findAll(query);

    if (query.no_pagination) {
      return responseSuccess(
        true,
        'Permissions retrieved successfully',
        result.items,
      );
    }

    return responseSuccess(
      true,
      'Permissions retrieved successfully',
      result.items,
      buildPaginationMeta(result),
    );
  }

  /**
   * GET /admin/permissions/:id — single permission with its menu + rolePermissions.
   * @returns `responseSuccess` with `data: PermissionEntity`.
   */
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const permission = await this.permissionService.findOne(id);

    return responseSuccess(
      true,
      'Permission retrieved successfully',
      permission,
    );
  }

  /**
   * POST /admin/permissions — create a permission.
   * NOTE: `@RequirePermission('permission.create')` is intentionally commented out.
   * @returns `responseSuccess` with `data: PermissionEntity`.
   */
  @ApiBearerAuth('bearerAuth')
  @Post()
  // @RequirePermission('permission.create')
  async create(@Body() dto: CreatePermissionDto) {
    const permission = await this.permissionService.create(dto);

    return responseSuccess(true, 'Permission created successfully', permission);
  }

  /**
   * PATCH /admin/permissions/:id — update a permission (invalidates role caches).
   * NOTE: `@RequirePermission('permission.update')` is intentionally commented out.
   * @returns `responseSuccess` with `data: PermissionEntity`.
   */
  @ApiBearerAuth('bearerAuth')
  @Patch(':id')
  // @RequirePermission('permission.update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionDto,
  ) {
    const permission = await this.permissionService.update(id, dto);

    return responseSuccess(true, 'Permission updated successfully', permission);
  }

  /**
   * DELETE /admin/permissions/:id — delete a permission (blocked while assigned to a role).
   * NOTE: `@RequirePermission('permission.delete')` is intentionally commented out.
   * @returns `responseSuccess` (no `data`) on success.
   */
  @ApiBearerAuth('bearerAuth')
  @Delete(':id')
  // @RequirePermission('permission.delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.permissionService.remove(id);

    return responseSuccess(true, 'Permission deleted successfully');
  }
}

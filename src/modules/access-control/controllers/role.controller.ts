import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { CreateRoleDto } from '../dto/role/create-role.dto';
import { UpdateRoleDto } from '../dto/role/update-role.dto';
import { RoleService } from '../../access-control/services/role.service';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { buildPaginationMeta } from '@common/helpers/pagination.helper';
import { responseSuccess } from '@common/helpers/response.helper';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { ShowFilter } from '@common/dto/pagination-query.dto';
@ApiTags('Admin - Roles')
@Controller('admin/roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  /**
   * GET /admin/roles — paginated role list (supports `search`).
   * @returns `responseSuccess` with `data: RoleEntity[]` and pagination meta (unless `no_pagination`).
   */
  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'show', required: false, type: String, enum: ShowFilter })
  @UseGuards(AuthGuard)
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.roleService.findAll(query);

    if (query.no_pagination) {
      return responseSuccess(
        true,
        'Roles retrieved successfully',
        result.items,
      );
    }

    return responseSuccess(
      true,
      'Roles retrieved successfully',
      result.items,
      buildPaginationMeta(result),
    );
  }

  @Get('statistics')
  async getStatistics() {
    const stats = await this.roleService.getStatistics();
    return responseSuccess(
      true,
      'Role statistics retrieved successfully',
      stats,
    );
  }

  /**
   * GET /admin/roles/:id — role with its permission-assignment view model
   * (every permission grouped by menu, `is_checked` marks held ones).
   * @returns `responseSuccess` with `data: { role fields, menus: MenuPermissionGroup[] }`.
   */
  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const role = await this.roleService.findOneWithPermissionMapping(id);

    return responseSuccess(true, 'Role retrieved successfully', role);
  }

  /**
   * POST /admin/roles — create a role (optionally with permissions).
   * NOTE: `@RequirePermission('role.create')` is intentionally commented out.
   * @returns `responseSuccess` with `data: RoleEntity`.
   */
  @ApiBearerAuth('bearerAuth')
  @Post()
  @UseGuards(AuthGuard)
  // @RequirePermission('role.create')
  async create(@Body() dto: CreateRoleDto) {
    const role = await this.roleService.create(dto);

    return responseSuccess(true, 'Role created successfully', role);
  }

  /**
   * PUT /admin/roles/:id — update a role (optionally replace permissions).
   * NOTE: `@RequirePermission('role.update')` is intentionally commented out.
   * @returns `responseSuccess` with `data: RoleEntity`.
   */
  @ApiBearerAuth('bearerAuth')
  @Put(':id')
  @UseGuards(AuthGuard)
  // @RequirePermission('role.update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const role = await this.roleService.update(id, dto);

    return responseSuccess(true, 'Role updated successfully', role);
  }

  /**
   * DELETE /admin/roles/:id — delete a role (requires `role.delete`; blocked for
   * system roles / roles with users — enforced in the service).
   * @returns `responseSuccess` (no `data`) on success.
   */
  @ApiBearerAuth('bearerAuth')
  @Delete(':id')
  @UseGuards(AuthGuard)
  @RequirePermission('role.delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.roleService.remove(id);

    return responseSuccess(true, 'Role deleted successfully');
  }
}

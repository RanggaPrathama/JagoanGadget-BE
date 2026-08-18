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
import { CreateMenuDto } from '../dto/menu/create-menu.dto';
import { GenerateMenuCodeQueryDto } from '../dto/menu/generate-menu-code-query.dto';
import { UpdateMenuDto } from '../dto/menu/update-menu.dto';
import {
  PaginationQueryMenuDto,
  ShowFilter,
} from '../dto/menu/pagination-query-menu.dto';
import { MenuService } from '../services/menu.service';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { responseSuccess } from '@common/helpers/response.helper';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { PermissionGuard } from '@common/guards/permission.guard';
import { buildPaginationMeta } from '@common/helpers/pagination.helper';

@ApiTags('Admin - Menus')
@Controller('admin/menus')
@UseGuards(AuthGuard, PermissionGuard)
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  /**
   * GET /admin/menus — paginated menu list (supports `search`, `show`, `hasPermission`).
   * @returns `responseSuccess` with `data: MenuEntity[]` and pagination meta (unless `no_pagination`).
   */
  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'show', required: false, type: String, enum: ShowFilter })
  @ApiQuery({ name: 'hasPermission', required: false, type: Boolean })
  async findAll(@Query() query: PaginationQueryMenuDto) {
    const result = await this.menuService.findAll(query);

    if (query.no_pagination) {
      return responseSuccess(
        true,
        'Menus retrieved successfully',
        result.items,
      );
    }

    return responseSuccess(
      true,
      'Menus retrieved successfully',
      result.items,
      buildPaginationMeta(result),
    );
  }

  /**
   * GET /admin/menus/tree — full nested menu forest (non-paginated).
   * @returns `responseSuccess` with `data: TreeNode<MenuEntity>[]` (roots; children nested).
   */
  @Get('tree')
  @ApiQuery({
    name: 'pagination',
    required: false,
    type: String,
    description:
      'Not applicable for tree endpoint. This endpoint is non-paginated.',
  })
  async findTree() {
    const menuTree = await this.menuService.findTree();

    return responseSuccess(true, 'Menu tree retrieved successfully', menuTree);
  }

  /**
   * GET /admin/menus/generate-code — preview the hierarchical code for a name+parent
   * without persisting (used by the menu form).
   * @returns `responseSuccess` with `data: HierarchicalCodeResult` (`code` + `fullPath`).
   */
  @Get('generate-code')
  @ApiQuery({ name: 'name', required: true, type: String })
  @ApiQuery({ name: 'parentId', required: false, type: String })
  async generateCode(@Query() query: GenerateMenuCodeQueryDto) {
    const result = await this.menuService.previewHierarchicalCode(
      query.name,
      query.parentId,
    );

    return responseSuccess(true, 'Menu code generated successfully', result);
  }

  /**
   * GET /admin/menus/:id — single menu with parent + children.
   * @returns `responseSuccess` with `data: MenuEntity`.
   */
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const menu = await this.menuService.findOne(id);

    return responseSuccess(true, 'Menu retrieved successfully', menu);
  }

  /**
   * POST /admin/menus — create a menu (requires `menu.create`).
   * @returns `responseSuccess` with `data: MenuEntity` (generated `code`).
   */
  @ApiBearerAuth('bearerAuth')
  @Post()
  @RequirePermission('menu.create')
  async create(@Body() dto: CreateMenuDto) {
    const menu = await this.menuService.create(dto);

    return responseSuccess(true, 'Menu created successfully', menu);
  }

  /**
   * PUT /admin/menus/:id — update a menu (requires `menu.update`).
   * @returns `responseSuccess` with `data: MenuEntity`.
   */
  @ApiBearerAuth('bearerAuth')
  @Put(':id')
  @RequirePermission('menu.update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMenuDto,
  ) {
    const menu = await this.menuService.update(id, dto);

    return responseSuccess(true, 'Menu updated successfully', menu);
  }

  /**
   * DELETE /admin/menus/:id — delete a menu + its permissions (requires `menu.delete`).
   * @returns `responseSuccess` (no `data`) on success.
   */
  @ApiBearerAuth('bearerAuth')
  @Delete(':id')
  @RequirePermission('menu.delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.menuService.remove(id);

    return responseSuccess(true, 'Menu deleted successfully');
  }
}

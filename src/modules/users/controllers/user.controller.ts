import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { buildPaginationMeta } from '@common/helpers/pagination.helper';
import { responseSuccess } from '@common/helpers/response.helper';
import { CreateUserDto } from '../dto/user/create-user.dto';
import { UpdateUserDto } from '../dto/user/update-user.dto';
import { QueryUserDto } from '../dto/user/query-user.dto';
import { UserService } from '../services/user.service';
import { UserRoleService } from '../services/user-role.service';
import { AssignUserRolesDto } from '../dto/user/assign-user-roles.dto';

@ApiTags('Admin - Users')
@ApiBearerAuth('bearerAuth')
@Controller('admin/users')
@UseGuards(AuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userRoleService: UserRoleService,
  ) {}

  @Get()
  // @RequirePermission('user.view')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isSuperadmin', required: false, type: Boolean })
  @ApiQuery({ name: 'roleId', required: false, type: String })
  async findAll(@Query() query: QueryUserDto) {
    const result = await this.userService.findAll(query);

    if (query.no_pagination) {
      return responseSuccess(
        true,
        'Users retrieved successfully',
        result.items,
      );
    }

    return responseSuccess(
      true,
      'Users retrieved successfully',
      result.items,
      buildPaginationMeta(result),
    );
  }

  @Get('statistics')
  async getStatistics() {
    const stats = await this.userService.getStatistics();
    return responseSuccess(
      true,
      'User statistics retrieved successfully',
      stats,
    );
  }

  @Get(':userId')
  //@RequirePermission('user.view')
  async findOne(@Param('userId') userId: string) {
    const user = await this.userService.findOne(userId);
    return responseSuccess(true, 'User retrieved successfully', user);
  }

  @Post()
  //@RequirePermission('user.create')
  async create(@Body() dto: CreateUserDto) {
    const user = await this.userService.create(dto);
    return responseSuccess(true, 'User created successfully', user);
  }

  @Put(':userId')
  //@RequirePermission('user.update')
  async update(@Param('userId') userId: string, @Body() dto: UpdateUserDto) {
    const user = await this.userService.update(userId, dto);
    return responseSuccess(true, 'User updated successfully', user);
  }

  @Delete(':userId')
  //@RequirePermission('user.delete')
  async remove(@Param('userId') userId: string) {
    await this.userService.remove(userId);
    return responseSuccess(true, 'User deleted successfully');
  }

  @Get(':userId/roles')
  //@RequirePermission('user.view')
  async getUserRoles(@Param('userId') userId: string) {
    const userRoles = await this.userRoleService.getUserRoles(userId);
    return responseSuccess(
      true,
      'User roles retrieved successfully',
      userRoles,
    );
  }

  @Put(':userId/roles')
  //@RequirePermission('user.update')
  async setUserRoles(
    @Param('userId') userId: string,
    @Body() dto: AssignUserRolesDto,
  ) {
    await this.userRoleService.setUserRoles(userId, dto.roleIds);
    return responseSuccess(true, 'User roles updated successfully');
  }
}

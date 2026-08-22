import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MenuEntity,
  RoleEntity,
  RolePermissionEntity,
  UserRoleEntity,
} from './entities/index';
import {
  MenuController,
  PermissionController,
  RoleController,
} from './controllers/index';
import {
  MenuService,
  PermissionService,
  RoleService,
  PermissionCacheService,
  AccessControlService,
} from './services/index';
import { PermissionEntity } from './entities/permission.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      MenuEntity,
      RoleEntity,
      PermissionEntity,
      RolePermissionEntity,
      UserRoleEntity,
    ]),
  ],
  controllers: [MenuController, PermissionController, RoleController],
  providers: [
    MenuService,
    PermissionService,
    RoleService,
    PermissionCacheService,
    AccessControlService,
  ],
  exports: [
    TypeOrmModule,
    MenuService,
    PermissionService,
    RoleService,
    PermissionCacheService,
    AccessControlService,
  ],
})
export class AccessControlModule {}

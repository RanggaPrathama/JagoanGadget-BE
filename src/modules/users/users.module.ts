import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { RoleEntity } from '../access-control/entities/role.entity';
import { UserRoleEntity } from '../access-control/entities/user-role.entity';
import { AccountEntity } from './entities/account.entity';
import { SessionEntity } from './entities/session.entity';
import { UserEntity } from './entities/user.entity';
import { MeController } from './controllers/me.controller';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { ProfileService } from './services/profile.service';
import { UserRoleService } from './services/user-role.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserRoleEntity,
      RoleEntity,
      UserEntity,
      SessionEntity,
      AccountEntity,
    ]),
    AccessControlModule,
    UploadsModule,
  ],
  controllers: [UserController, MeController],
  providers: [UserRoleService, UserService, ProfileService],
  exports: [TypeOrmModule, UserService],
})
export class UsersModule {}

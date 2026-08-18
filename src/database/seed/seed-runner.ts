import * as dotenv from 'dotenv';
dotenv.config();

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from '@config/configuration';
import { envValidationSchema } from '@config/env.validation';
import { DatabaseModule } from '@database/database.module';
import { MenuEntity } from '@module/access-control/entities/menu.entity';
import { PermissionEntity } from '@module/access-control/entities/permission.entity';
import { RoleEntity } from '@module/access-control/entities/role.entity';
import { RolePermissionEntity } from '@module/access-control/entities/role-permission.entity';
import { UserRoleEntity } from '@module/access-control/entities/user-role.entity';
import { UserEntity } from '@module/users/entities/user.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    DatabaseModule,
    TypeOrmModule.forFeature([
      MenuEntity,
      PermissionEntity,
      RoleEntity,
      RolePermissionEntity,
      UserRoleEntity,
      UserEntity,
    ]),
  ],
  providers: [SeedService],
})
class SeedRunnerModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedRunnerModule, {
    logger: ['error', 'warn', 'log'],
  });

  await app.get(SeedService).seed();
  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});

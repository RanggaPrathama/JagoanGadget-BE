import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorRbacPermissions1717400000000 implements MigrationInterface {
  name = 'RefactorRbacPermissions1717400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create permissions table
    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "menu_id" uuid,
        "name" varchar(150) NOT NULL,
        "code" varchar(100) NOT NULL,
        "description" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_permissions_code" UNIQUE ("code"),
        CONSTRAINT "PK_permissions" PRIMARY KEY ("id")
      )
    `);

    // 2. Create role_permissions table
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "role_id" uuid NOT NULL,
        "permission_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_role_permissions_role_permission" UNIQUE ("role_id", "permission_id"),
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("id")
      )
    `);

    // 3. Create user_roles table
    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "user_id" varchar(255) NOT NULL,
        "role_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_roles_user_role" UNIQUE ("user_id", "role_id"),
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("id")
      )
    `);

    // 4. Add is_system column to roles
    await queryRunner.query(`
      ALTER TABLE "roles" ADD COLUMN "is_system" boolean NOT NULL DEFAULT false
    `);

    // 5. Rename menus.path to menus.route, drop unique, add nullable
    await queryRunner.query(
      `ALTER TABLE "menus" DROP CONSTRAINT "UQ_menus_path"`,
    );
    await queryRunner.query(
      `ALTER TABLE "menus" RENAME COLUMN "path" TO "route"`,
    );
    await queryRunner.query(
      `ALTER TABLE "menus" ALTER COLUMN "route" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "menus" ALTER COLUMN "route" DROP DEFAULT`,
    );

    // 6. Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "permissions"
      ADD CONSTRAINT "FK_permissions_menu_id"
      FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "role_permissions"
      ADD CONSTRAINT "FK_role_permissions_role_id"
      FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "role_permissions"
      ADD CONSTRAINT "FK_role_permissions_permission_id"
      FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_roles"
      ADD CONSTRAINT "FK_user_roles_role_id"
      FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
    `);

    // 7. Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_permissions_menu_id" ON "permissions" ("menu_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_role_permissions_role_id" ON "role_permissions" ("role_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_role_permissions_permission_id" ON "role_permissions" ("permission_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_roles_user_id" ON "user_roles" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_roles_role_id" ON "user_roles" ("role_id")`,
    );

    // 8. Migrate existing user role data from users.role_id to user_roles
    await queryRunner.query(`
      INSERT INTO "user_roles" ("id", "user_id", "role_id", "created_at", "updated_at")
      SELECT gen_random_uuid(), "auth_user_id", "role_id", now(), now()
      FROM "users"
      WHERE "role_id" IS NOT NULL
    `);

    // 9. Drop role_id column from users (find FK constraint dynamically)
    const fkResult = await queryRunner.query(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'users'::regclass
        AND confrelid = 'roles'::regclass
        AND contype = 'f'
    `);
    for (const row of fkResult) {
      await queryRunner.query(
        `ALTER TABLE "users" DROP CONSTRAINT "${row.conname}"`,
      );
    }
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role_id"`);

    // 10. Drop role_menus table
    await queryRunner.query(`DROP TABLE "role_menus"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate role_menus table
    await queryRunner.query(`
      CREATE TABLE "role_menus" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "role_id" uuid NOT NULL,
        "menu_id" uuid NOT NULL,
        "can_view" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_role_menus_role_menu" UNIQUE ("role_id", "menu_id"),
        CONSTRAINT "PK_role_menus" PRIMARY KEY ("id")
      )
    `);

    // Add role_id back to users
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "role_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_role_id"
      FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL
    `);

    // Migrate data back from user_roles to users.role_id (first role only)
    await queryRunner.query(`
      UPDATE "users" u SET "role_id" = (
        SELECT "role_id" FROM "user_roles" ur WHERE ur."user_id" = u."auth_user_id" LIMIT 1
      )
    `);

    // Drop tables and indexes
    await queryRunner.query(`DROP INDEX "IDX_user_roles_role_id"`);
    await queryRunner.query(`DROP INDEX "IDX_user_roles_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_role_permissions_permission_id"`);
    await queryRunner.query(`DROP INDEX "IDX_role_permissions_role_id"`);
    await queryRunner.query(`DROP INDEX "IDX_permissions_menu_id"`);
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "permissions"`);

    // Remove is_system from roles
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "is_system"`);

    // Rename route back to path
    await queryRunner.query(
      `ALTER TABLE "menus" RENAME COLUMN "route" TO "path"`,
    );
    await queryRunner.query(
      `ALTER TABLE "menus" ALTER COLUMN "path" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "menus" ALTER COLUMN "path" SET DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "menus" ADD CONSTRAINT "UQ_menus_path" UNIQUE ("path")`,
    );
  }
}

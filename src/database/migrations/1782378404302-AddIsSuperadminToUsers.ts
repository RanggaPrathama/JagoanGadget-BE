import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsSuperadminToUsers1782378404302 implements MigrationInterface {
  name = 'AddIsSuperadminToUsers1782378404302';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "is_superadmin" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_superadmin"`);
  }
}

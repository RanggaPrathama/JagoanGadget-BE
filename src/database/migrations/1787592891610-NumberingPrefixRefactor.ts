import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Numbering module redesign:
 *  - number_format.preview: added NOT NULL DEFAULT '' (service always recomputes)
 *  - number_format_d: drop legacy inline columns (type/value/prefix_name),
 *    keep FK prefix_id -> prefix ON DELETE RESTRICT,
 *    unique (number_format_id, index) so segment order is well-defined.
 *  - prefix.name: non-unique index -> unique constraint.
 *
 * Hand-adjusted after generation: the generated file contained unrelated
 * Better Auth drift (verification table) and missed the legacy column drops
 * because the dev DB was already synced. Idempotent guards make it safe to
 * run on both synced-dev and fresh databases.
 */
export class NumberingPrefixRefactor1787592891610 implements MigrationInterface {
  name = 'NumberingPrefixRefactor1787592891610';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // preview column on header
    const preview = await queryRunner.hasColumn('number_format', 'preview');
    if (!preview) {
      await queryRunner.query(
        `ALTER TABLE "number_format" ADD "preview" character varying(255) NOT NULL DEFAULT ''`,
      );
    }

    // legacy inline segment columns -> replaced by FK prefix_id
    for (const col of ['type', 'value', 'prefix_name']) {
      if (await queryRunner.hasColumn('number_format_d', col)) {
        await queryRunner.query(
          `ALTER TABLE "number_format_d" DROP COLUMN "${col}"`,
        );
      }
    }

    // FK: CASCADE -> RESTRICT (drop by generated name, recreate canonical)
    await queryRunner.query(`
      DO $$
      DECLARE fk text;
      BEGIN
        SELECT conname INTO fk FROM pg_constraint
        WHERE contype = 'f'
          AND conrelid = '"number_format_d"'::regclass
          AND confrelid = '"prefix"'::regclass;
        IF fk IS NOT NULL THEN
          EXECUTE format('ALTER TABLE "number_format_d" DROP CONSTRAINT %I', fk);
        END IF;
      END $$;
    `);
    const hasFk = await queryRunner.query(
      `SELECT 1 FROM pg_constraint WHERE conname = 'FK_nf_segment_prefix'`,
    );
    if (!hasFk.length) {
      await queryRunner.query(
        `ALTER TABLE "number_format_d" ADD CONSTRAINT "FK_nf_segment_prefix" FOREIGN KEY ("prefix_id") REFERENCES "prefix"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
      );
      await queryRunner.query(
        `ALTER TABLE "number_format_d" ADD CONSTRAINT "FK_nf_segment_number_format" FOREIGN KEY ("number_format_id") REFERENCES "number_format"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }
    // ensure prefix_id exists when running on a fresh DB where the table
    // still had only the legacy columns
    if (!(await queryRunner.hasColumn('number_format_d', 'prefix_id'))) {
      await queryRunner.query(
        `ALTER TABLE "number_format_d" ADD "prefix_id" uuid NOT NULL`,
      );
    }

    // unique composite index for deterministic segment order
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_nf_segment_order" ON "number_format_d" ("number_format_id", "index")`,
    );

    // prefix.name unique
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_prefix_name"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_prefix_name" ON "prefix" ("name")`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(queryRunner: QueryRunner): Promise<never> {
    throw new Error('Irreversible migration — restore from backup instead');
  }
}

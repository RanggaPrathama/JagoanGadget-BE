import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the products catalog + EAV tables:
 *   products, product_skus, product_images, attributes, sku_attribute_values.
 * NOTE: written by hand because the dev database already had these tables
 * created via synchronize, so `migration:generate` produced no catalog diff.
 */
export class CreateProductsCatalog1787383649000 implements MigrationInterface {
  name = 'CreateProductsCatalog1787383649000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Global EAV attribute catalog
    await queryRunner.query(
      `CREATE TABLE "attributes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "data_type" character varying(20) NOT NULL DEFAULT 'string', CONSTRAINT "PK_attributes" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_attributes_name" ON "attributes" ("name")`,
    );

    // Parent catalog record
    await queryRunner.query(
      `CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "brand_id" uuid, "category_id" uuid NOT NULL, "name" character varying(150) NOT NULL, "slug" character varying(160) NOT NULL, "description" text, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_products" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_products_category_id" ON "products" ("category_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_products_name" ON "products" ("name")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_products_slug" ON "products" ("slug")`);

    // Physical sellable unit (price belongs to SKU)
    await queryRunner.query(
      `CREATE TABLE "product_skus" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "product_id" uuid NOT NULL, "sku_code" character varying(100) NOT NULL, "variant_name" character varying(150) NOT NULL, "price" numeric(19,2) NOT NULL, CONSTRAINT "PK_product_skus" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_product_skus_sku_code" ON "product_skus" ("sku_code")`,
    );

    // SKU images
    await queryRunner.query(
      `CREATE TABLE "product_images" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sku_id" uuid NOT NULL, "image_url" character varying(1024) NOT NULL, "is_primary" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_product_images" PRIMARY KEY ("id"))`,
    );

    // EAV value rows (one value per attribute per SKU)
    await queryRunner.query(
      `CREATE TABLE "sku_attribute_values" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sku_id" uuid NOT NULL, "attribute_id" uuid NOT NULL, "value" text NOT NULL, CONSTRAINT "PK_sku_attribute_values" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_sku_attr" ON "sku_attribute_values" ("sku_id", "attribute_id")`,
    );

    // Foreign keys
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_products_brand" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_products_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_skus" ADD CONSTRAINT "FK_product_skus_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" ADD CONSTRAINT "FK_product_images_sku" FOREIGN KEY ("sku_id") REFERENCES "product_skus"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sku_attribute_values" ADD CONSTRAINT "FK_sku_attr_sku" FOREIGN KEY ("sku_id") REFERENCES "product_skus"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sku_attribute_values" ADD CONSTRAINT "FK_sku_attr_attribute" FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sku_attribute_values" DROP CONSTRAINT "FK_sku_attr_attribute"`);
    await queryRunner.query(`ALTER TABLE "sku_attribute_values" DROP CONSTRAINT "FK_sku_attr_sku"`);
    await queryRunner.query(`ALTER TABLE "product_images" DROP CONSTRAINT "FK_product_images_sku"`);
    await queryRunner.query(`ALTER TABLE "product_skus" DROP CONSTRAINT "FK_product_skus_product"`);
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_products_category"`);
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_products_brand"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_sku_attr"`);
    await queryRunner.query(`DROP TABLE "sku_attribute_values"`);
    await queryRunner.query(`DROP TABLE "product_images"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_product_skus_sku_code"`);
    await queryRunner.query(`DROP TABLE "product_skus"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_products_slug"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_products_name"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_products_category_id"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_attributes_name"`);
    await queryRunner.query(`DROP TABLE "attributes"`);
  }
}

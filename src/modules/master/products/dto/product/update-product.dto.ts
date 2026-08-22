import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/**
 * Partial update of product SCALAR fields only. SKU matrix editing is out of
 * scope (variant management is a frontend concern) — `update` does NOT recreate SKUs.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}

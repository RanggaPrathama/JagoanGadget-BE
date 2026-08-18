import { BadRequestException } from '@nestjs/common';

/**
 * Validates that a filename/path segment is safe (no traversal attacks).
 * Throws BadRequestException if the value contains path traversal characters.
 */
export function assertSafeFilename(value: string): void {
  if (value.includes('/') || value.includes('\\') || value.includes('..')) {
    throw new BadRequestException(`Invalid path segment: ${value}`);
  }
}

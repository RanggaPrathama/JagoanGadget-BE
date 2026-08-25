import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  PaginationQueryDto,
} from '../dto/pagination-query.dto';
import { PaginationMeta } from './response.helper';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  noPagination: boolean;
  show?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export function buildPaginationParams(
  query: PaginationQueryDto,
): PaginationParams {
  const page = query.page ?? DEFAULT_PAGE;
  const limit = query.limit ?? DEFAULT_LIMIT;
  const search = query.search?.trim() || undefined;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    search,
    noPagination: query.no_pagination ?? false,
    show: query.show ?? undefined,
  };
}

export function buildPaginationMeta({
  total,
  page,
  limit,
}: Pick<PaginatedResult<unknown>, 'total' | 'page' | 'limit'>): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    page,
    limit,
    totalItems: total,
    totalPages,
    hasNextPage: totalPages > 0 && page < totalPages,
    hasPreviousPage: totalPages > 0 && page > 1,
  };
}

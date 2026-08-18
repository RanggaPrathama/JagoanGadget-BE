export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function responseSuccess<T>(
  success: boolean,
  message: string,
  data?: T | null,
  pagination?: PaginationMeta | null,
) {
  return {
    success,
    message,
    data: data ?? null,
    pagination: pagination ?? null,
  };
}

export function responseError(
  success: boolean,
  message: string,
  errors?: unknown,
) {
  return {
    success,
    message,
    errors: errors ?? null,
  };
}

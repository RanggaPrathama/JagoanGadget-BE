import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorResponseBody = {
  success: false;
  message: string;
  errors: string | string[] | null;
  code?: string;
  timestamp: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const normalized = this.normalizeException(exception);

    const logPayload = {
      statusCode: normalized.statusCode,
      path: request.originalUrl ?? request.url,
      method: request.method,
      ...(normalized.errors && {
        details: Array.isArray(normalized.errors)
          ? normalized.errors.join('; ')
          : normalized.errors,
      }),
    };

    if (normalized.statusCode >= 500) {
      this.logger.error(
        {
          ...logPayload,
          stack: exception instanceof Error ? exception.stack : undefined,
        },
        normalized.message,
      );
    } else {
      this.logger.warn(logPayload, normalized.message);
    }

    const responseBody: ErrorResponseBody = {
      success: false,
      message: normalized.message,
      errors: normalized.errors,
      timestamp: new Date().toISOString(),
    };

    if (normalized.code) {
      responseBody.code = normalized.code;
    }

    response.status(normalized.statusCode).json(responseBody);
  }

  private normalizeException(exception: unknown): {
    statusCode: number;
    message: string;
    errors: string | string[] | null;
    code?: string;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        return {
          statusCode,
          message: exceptionResponse,
          errors: null,
        };
      }

      if (
        exceptionResponse &&
        typeof exceptionResponse === 'object' &&
        !Array.isArray(exceptionResponse)
      ) {
        const responseObject = exceptionResponse as Record<string, unknown>;
        const message =
          this.pickMessage(responseObject.message) ?? exception.message;
        const error = this.pickError(
          responseObject.error,
          responseObject.message,
        );
        const code =
          typeof responseObject.code === 'string'
            ? responseObject.code
            : undefined;

        return {
          statusCode,
          message,
          errors: error,
          code,
        };
      }
    }

    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message || 'Internal server error',
        errors: exception.name || null,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      errors: null,
    };
  }

  private pickMessage(value: unknown): string | null {
    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value) && value.length > 0) {
      const firstMessage = value.find((item) => typeof item === 'string');
      return typeof firstMessage === 'string' ? firstMessage : null;
    }

    return null;
  }

  private pickError(
    error: unknown,
    message: unknown,
  ): string | string[] | null {
    if (typeof error === 'string') {
      return error;
    }

    if (
      Array.isArray(message) &&
      message.every((item) => typeof item === 'string')
    ) {
      return message as string[];
    }

    return null;
  }
}

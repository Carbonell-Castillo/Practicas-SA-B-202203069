import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { SolicitudNotFoundError } from '../../solicitudes/errors/solicitud-not-found.error';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

interface ResolvedError {
  statusCode: HttpStatus;
  message: string | string[];
  error: string;
}

/**
 * Filtro global: única fuente de verdad para el formato de las respuestas de error.
 * Nunca deja escapar detalles internos de Prisma u otras dependencias al cliente.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const resolved = this.resolveError(exception);

    if (resolved.statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Excepción no controlada en ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseBody = {
      ...resolved,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(resolved.statusCode).json(body);
  }

  private resolveError(exception: unknown): ResolvedError {
    if (exception instanceof SolicitudNotFoundError) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
        error: 'Not Found',
      };
    }

    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    // Cualquier otro error (Prisma, drivers, errores inesperados) se trata
    // siempre como 500 genérico: no se exponen mensajes ni stacks internos.
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ha ocurrido un error interno. Intenta nuevamente más tarde.',
      error: 'Internal Server Error',
    };
  }

  private fromHttpException(exception: HttpException): ResolvedError {
    const statusCode = exception.getStatus();
    const payload = exception.getResponse();

    if (
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload
    ) {
      const message = (payload as { message: string | string[] }).message;
      const error =
        'error' in payload &&
        typeof (payload as { error?: unknown }).error === 'string'
          ? (payload as { error: string }).error
          : exception.name;
      return { statusCode, message, error };
    }

    return { statusCode, message: exception.message, error: exception.name };
  }
}

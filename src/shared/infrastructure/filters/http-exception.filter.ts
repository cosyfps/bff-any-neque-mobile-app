import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Formato de error uniforme que la app da por sentado en todo endpoint.
 * Cualquier cambio aca rompe el manejo de errores de `ui-any-neque-mobile-app`.
 */
export interface ErrorResponseBody {
  statusCode: number;
  message: string;
}

const GENERIC_ERROR_MESSAGE = 'Internal server error';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const body: ErrorResponseBody = {
      statusCode,
      message: this.resolveMessage(exception, statusCode),
    };

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${statusCode} - ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json(body);
  }

  /**
   * El detalle interno de un 5xx nunca se filtra al cliente: se responde generico
   * y el detalle queda en el log.
   */
  private resolveMessage(exception: unknown, statusCode: number): string {
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR || !(exception instanceof HttpException)) {
      return GENERIC_ERROR_MESSAGE;
    }

    const payload = exception.getResponse();

    if (typeof payload === 'string') {
      return payload;
    }

    const message = (payload as { message?: unknown }).message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }

    return exception.message;
  }
}

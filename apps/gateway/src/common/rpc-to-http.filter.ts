import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ERROR_STATUS, ErrorCode, RpcErrorPayload } from '@app/common';

/**
 * Filtro HTTP global del gateway:
 * - Deja pasar las HttpException (ValidationPipe, JwtAuthGuard, etc.).
 * - Traduce los errores de negocio propagados por NATS ({ code, message }) a su
 *   status HTTP según el mapa ERROR_STATUS de @app/common.
 */
@Catch()
export class RpcToHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcToHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      res
        .status(status)
        .json(
          typeof body === 'string'
            ? { statusCode: status, message: body }
            : body,
        );
      return;
    }

    const rpcError = this.asRpcError(exception);
    if (rpcError) {
      const status = ERROR_STATUS[rpcError.code] ?? 500;
      res.status(status).json({
        statusCode: status,
        error: rpcError.code,
        message: rpcError.message,
      });
      return;
    }

    this.logger.error('Error no manejado en el gateway', exception);
    res.status(500).json({
      statusCode: 500,
      error: ErrorCode.INTERNAL,
      message: 'Error interno del servidor',
    });
  }

  private asRpcError(exception: unknown): RpcErrorPayload | null {
    if (
      exception !== null &&
      typeof exception === 'object' &&
      'code' in exception &&
      'message' in exception
    ) {
      const code = (exception as { code: unknown }).code;
      if (
        typeof code === 'string' &&
        (Object.values(ErrorCode) as string[]).includes(code)
      ) {
        return {
          code: code as ErrorCode,
          message: String((exception as { message: unknown }).message),
        };
      }
    }
    return null;
  }
}

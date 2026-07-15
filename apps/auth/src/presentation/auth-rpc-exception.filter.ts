import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { ErrorCode, RpcErrorPayload } from '@app/common';
import {
  DomainError,
  EmailAlreadyInUseError,
  InvalidCredentialsError,
  InvalidEmailError,
  InvalidRefreshTokenError,
  RefreshTokenReuseError,
} from '../domain/errors/auth-domain.errors';

function mapDomainError(error: DomainError): ErrorCode {
  if (error instanceof InvalidCredentialsError)
    return ErrorCode.INVALID_CREDENTIALS;
  if (error instanceof EmailAlreadyInUseError)
    return ErrorCode.EMAIL_ALREADY_IN_USE;
  if (error instanceof RefreshTokenReuseError)
    return ErrorCode.REFRESH_TOKEN_REUSE;
  if (error instanceof InvalidRefreshTokenError)
    return ErrorCode.INVALID_REFRESH_TOKEN;
  if (error instanceof InvalidEmailError) return ErrorCode.VALIDATION;
  return ErrorCode.INTERNAL;
}

/**
 * Traduce errores de dominio a un RpcException con payload { code, message }
 * serializable, para que el gateway lo mapee a un status HTTP.
 */
@Catch()
export class AuthRpcExceptionFilter extends BaseRpcExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): Observable<unknown> {
    if (exception instanceof DomainError) {
      const payload: RpcErrorPayload = {
        code: mapDomainError(exception),
        message: exception.message,
      };
      return super.catch(new RpcException(payload), host);
    }
    return super.catch(exception, host);
  }
}

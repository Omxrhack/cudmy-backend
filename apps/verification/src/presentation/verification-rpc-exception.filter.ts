import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { ErrorCode, RpcErrorPayload } from '@app/common';
import {
  CodeExpiredError,
  DomainError,
  InvalidChannelError,
  InvalidCodeError,
  InvalidDestinationError,
  NoActiveCodeError,
  ResendCooldownError,
  TooManyAttemptsError,
} from '../domain/errors/verification-domain.errors';

function mapDomainError(error: DomainError): ErrorCode {
  if (error instanceof NoActiveCodeError) return ErrorCode.NO_ACTIVE_CODE;
  if (error instanceof CodeExpiredError) return ErrorCode.CODE_EXPIRED;
  if (error instanceof TooManyAttemptsError) return ErrorCode.TOO_MANY_ATTEMPTS;
  if (error instanceof InvalidCodeError) return ErrorCode.INVALID_CODE;
  if (error instanceof ResendCooldownError) return ErrorCode.RESEND_COOLDOWN;
  if (
    error instanceof InvalidChannelError ||
    error instanceof InvalidDestinationError
  ) {
    return ErrorCode.VALIDATION;
  }
  return ErrorCode.INTERNAL;
}

@Catch()
export class VerificationRpcExceptionFilter extends BaseRpcExceptionFilter {
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

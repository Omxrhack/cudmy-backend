/** Códigos de error de negocio, contrato entre auth (emisor RPC) y gateway (mapeo HTTP). */
export enum ErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_IN_USE = 'EMAIL_ALREADY_IN_USE',
  REFRESH_TOKEN_REUSE = 'REFRESH_TOKEN_REUSE',
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',
  VALIDATION = 'VALIDATION',
  INTERNAL = 'INTERNAL',
  // Verificación OTP
  NO_ACTIVE_CODE = 'NO_ACTIVE_CODE',
  CODE_EXPIRED = 'CODE_EXPIRED',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
  INVALID_CODE = 'INVALID_CODE',
  RESEND_COOLDOWN = 'RESEND_COOLDOWN',
}

/** Forma serializable que viaja en el RpcException a través de NATS. */
export interface RpcErrorPayload {
  code: ErrorCode;
  message: string;
}

/** Mapa código de negocio -> status HTTP (usado por el exception filter del gateway). */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  [ErrorCode.INVALID_CREDENTIALS]: 401,
  [ErrorCode.EMAIL_ALREADY_IN_USE]: 409,
  [ErrorCode.REFRESH_TOKEN_REUSE]: 401,
  [ErrorCode.INVALID_REFRESH_TOKEN]: 401,
  [ErrorCode.VALIDATION]: 400,
  [ErrorCode.INTERNAL]: 500,
  [ErrorCode.NO_ACTIVE_CODE]: 404,
  [ErrorCode.CODE_EXPIRED]: 410,
  [ErrorCode.TOO_MANY_ATTEMPTS]: 429,
  [ErrorCode.INVALID_CODE]: 400,
  [ErrorCode.RESEND_COOLDOWN]: 429,
};

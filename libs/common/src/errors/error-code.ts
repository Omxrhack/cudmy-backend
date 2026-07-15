/** Códigos de error de negocio, contrato entre auth (emisor RPC) y gateway (mapeo HTTP). */
export enum ErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_IN_USE = 'EMAIL_ALREADY_IN_USE',
  REFRESH_TOKEN_REUSE = 'REFRESH_TOKEN_REUSE',
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',
  VALIDATION = 'VALIDATION',
  INTERNAL = 'INTERNAL',
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
};

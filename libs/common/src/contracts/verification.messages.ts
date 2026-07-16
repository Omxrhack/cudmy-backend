import { VerificationChannel } from './verification.patterns';

/** Contratos de payload compartidos gateway/auth ↔ verification. */

export interface RequestCodeRequest {
  userId: string;
  channel: VerificationChannel;
  destination: string;
}

export interface RequestCodeResponse {
  channel: VerificationChannel;
  expiresAt: string;
}

export interface VerifyCodeRequest {
  userId: string;
  channel: VerificationChannel;
  code: string;
}

export interface VerifyCodeResponse {
  verified: true;
  channel: VerificationChannel;
}

/** Evento emitido por auth al crear un usuario. */
export interface UserRegisteredEvent {
  userId: string;
  email: string;
  phoneNumber: string;
}

/** Evento emitido por verification al confirmar un canal. */
export interface ContactVerifiedEvent {
  userId: string;
  channel: VerificationChannel;
}

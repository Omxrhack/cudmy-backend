import { ChannelValue, OtpCode } from '../entities/otp-code.entity';

/** Datos para persistir un código OTP nuevo. */
export interface NewOtpCode {
  userId: string;
  channel: ChannelValue;
  destination: string;
  codeHash: string;
  expiresAt: Date;
}

/** Puerto de persistencia de códigos OTP (implementado en infraestructura). */
export abstract class VerificationCodeRepository {
  /** Invalida el código activo previo (si existe) e inserta el nuevo, en una transacción. */
  abstract createInvalidatingPrevious(data: NewOtpCode): Promise<OtpCode>;
  /** Devuelve el código no consumido más reciente para (user, canal), o null. */
  abstract findActive(
    userId: string,
    channel: ChannelValue,
  ): Promise<OtpCode | null>;
  abstract incrementAttempts(id: string): Promise<void>;
  abstract consume(id: string): Promise<void>;
}

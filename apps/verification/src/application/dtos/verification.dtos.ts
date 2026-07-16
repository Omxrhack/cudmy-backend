import { ChannelValue } from '../../domain/entities/otp-code.entity';

export interface RequestCodeInput {
  userId: string;
  channel: string;
  destination: string;
}

export interface RequestCodeOutput {
  channel: ChannelValue;
  expiresAt: Date;
}

export interface VerifyCodeInput {
  userId: string;
  channel: string;
  code: string;
}

export interface VerifyCodeOutput {
  verified: true;
  channel: ChannelValue;
}

/** Parámetros de política OTP (leídos de env y pasados por-firma al caso de uso). */
export interface OtpPolicy {
  ttlMs: number;
  codeLength: number;
  maxAttempts: number;
  cooldownMs: number;
}

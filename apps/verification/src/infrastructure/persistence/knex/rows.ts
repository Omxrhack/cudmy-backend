import {
  ChannelValue,
  OtpCode,
} from '../../../domain/entities/otp-code.entity';

export interface VerificationCodeRow {
  id: string;
  user_id: string;
  channel: string;
  destination: string;
  code_hash: string;
  expires_at: Date;
  consumed_at: Date | null;
  attempts: number;
  created_at: Date;
}

export function toOtpCode(row: VerificationCodeRow): OtpCode {
  return new OtpCode({
    id: row.id,
    userId: row.user_id,
    channel: row.channel as ChannelValue,
    destination: row.destination,
    codeHash: row.code_hash,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
    attempts: row.attempts,
    createdAt: row.created_at,
  });
}

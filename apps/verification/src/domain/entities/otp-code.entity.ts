export type ChannelValue = 'sms' | 'email';

export interface OtpCodeProps {
  id: string;
  userId: string;
  channel: ChannelValue;
  destination: string;
  /** Hash (argon2) del código; nunca se guarda el código en claro. */
  codeHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  attempts: number;
  createdAt: Date;
}

/** Entidad de dominio para un código OTP emitido. */
export class OtpCode {
  readonly id: string;
  readonly userId: string;
  readonly channel: ChannelValue;
  readonly destination: string;
  readonly codeHash: string;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
  readonly attempts: number;
  readonly createdAt: Date;

  constructor(props: OtpCodeProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.channel = props.channel;
    this.destination = props.destination;
    this.codeHash = props.codeHash;
    this.expiresAt = props.expiresAt;
    this.consumedAt = props.consumedAt;
    this.attempts = props.attempts;
    this.createdAt = props.createdAt;
  }

  isConsumed(): boolean {
    return this.consumedAt !== null;
  }

  isExpired(now: Date): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }

  hasAttemptsLeft(maxAttempts: number): boolean {
    return this.attempts < maxAttempts;
  }

  isWithinCooldown(now: Date, cooldownMs: number): boolean {
    return now.getTime() - this.createdAt.getTime() < cooldownMs;
  }
}

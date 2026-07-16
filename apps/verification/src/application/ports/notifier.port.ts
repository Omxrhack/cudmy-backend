import { ChannelValue } from '../../domain/entities/otp-code.entity';

export interface NotifyInput {
  channel: ChannelValue;
  destination: string;
  code: string;
}

/** Entrega del código OTP (stub por consola ahora; Twilio/SMTP a futuro). */
export abstract class Notifier {
  abstract send(input: NotifyInput): Promise<void>;
}

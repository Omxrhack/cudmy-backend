import { ChannelValue } from '../entities/otp-code.entity';
import { InvalidChannelError } from '../errors/verification-domain.errors';

/** Value object de canal de verificación ('sms' | 'email'). */
export class Channel {
  private static readonly VALID: ChannelValue[] = ['sms', 'email'];

  readonly value: ChannelValue;

  constructor(value: string) {
    if (!Channel.VALID.includes(value as ChannelValue)) {
      throw new InvalidChannelError(value);
    }
    this.value = value as ChannelValue;
  }
}

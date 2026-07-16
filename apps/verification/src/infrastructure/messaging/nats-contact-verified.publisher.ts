import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  ContactVerifiedEvent,
  NATS_EVENTS_CLIENT,
  VERIFICATION_EVENTS,
} from '@app/common';
import { ContactVerifiedPublisher } from '../../application/ports/contact-verified.publisher.port';
import { ChannelValue } from '../../domain/entities/otp-code.entity';

@Injectable()
export class NatsContactVerifiedPublisher extends ContactVerifiedPublisher {
  constructor(
    @Inject(NATS_EVENTS_CLIENT) private readonly client: ClientProxy,
  ) {
    super();
  }

  async publish(userId: string, channel: ChannelValue): Promise<void> {
    const payload: ContactVerifiedEvent = { userId, channel };
    // emit() debe consumirse para que el mensaje se publique en NATS.
    await firstValueFrom(
      this.client.emit(VERIFICATION_EVENTS.CONTACT_VERIFIED, payload),
    );
  }
}

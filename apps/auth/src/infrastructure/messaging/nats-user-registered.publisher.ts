import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  AUTH_EVENTS,
  NATS_EVENTS_CLIENT,
  UserRegisteredEvent,
} from '@app/common';
import {
  UserRegisteredPayload,
  UserRegisteredPublisher,
} from '../../application/ports/user-registered.publisher.port';

@Injectable()
export class NatsUserRegisteredPublisher extends UserRegisteredPublisher {
  constructor(
    @Inject(NATS_EVENTS_CLIENT) private readonly client: ClientProxy,
  ) {
    super();
  }

  async publish(payload: UserRegisteredPayload): Promise<void> {
    const event: UserRegisteredEvent = payload;
    // emit() debe consumirse para que el mensaje se publique en NATS.
    await firstValueFrom(this.client.emit(AUTH_EVENTS.USER_REGISTERED, event));
  }
}

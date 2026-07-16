import { ChannelValue } from '../../domain/entities/otp-code.entity';

/** Publica el evento de contacto verificado (NATS en infraestructura). */
export abstract class ContactVerifiedPublisher {
  abstract publish(userId: string, channel: ChannelValue): Promise<void>;
}

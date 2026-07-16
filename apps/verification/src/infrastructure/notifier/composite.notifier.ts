import { ChannelValue } from '../../domain/entities/otp-code.entity';
import { Notifier, NotifyInput } from '../../application/ports/notifier.port';

/** Enruta la entrega al notificador configurado para cada canal. */
export class CompositeNotifier extends Notifier {
  constructor(private readonly byChannel: Record<ChannelValue, Notifier>) {
    super();
  }

  send(input: NotifyInput): Promise<void> {
    return this.byChannel[input.channel].send(input);
  }
}

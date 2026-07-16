import { ChannelValue } from '../../domain/entities/otp-code.entity';
import { Notifier, NotifyInput } from '../../application/ports/notifier.port';

/** Entrega en memoria: guarda los envíos para poder leerlos en los tests e2e. */
export class MemoryNotifier extends Notifier {
  static readonly sent: NotifyInput[] = [];

  static last(channel?: ChannelValue): NotifyInput | undefined {
    const items = channel
      ? MemoryNotifier.sent.filter((s) => s.channel === channel)
      : MemoryNotifier.sent;
    return items[items.length - 1];
  }

  static clear(): void {
    MemoryNotifier.sent.length = 0;
  }

  send(input: NotifyInput): Promise<void> {
    MemoryNotifier.sent.push(input);
    return Promise.resolve();
  }
}

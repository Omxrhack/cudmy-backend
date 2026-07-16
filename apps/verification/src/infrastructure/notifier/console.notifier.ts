import { Logger } from '@nestjs/common';
import { Notifier, NotifyInput } from '../../application/ports/notifier.port';

/** Entrega stub: escribe el código al log (desarrollo). */
export class ConsoleNotifier extends Notifier {
  private readonly logger = new Logger('ConsoleNotifier');

  send(input: NotifyInput): Promise<void> {
    this.logger.log(
      `[${input.channel}] código para ${input.destination}: ${input.code}`,
    );
    return Promise.resolve();
  }
}

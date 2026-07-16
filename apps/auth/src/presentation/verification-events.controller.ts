import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ContactVerifiedEvent, VERIFICATION_EVENTS } from '@app/common';
import { MarkContactVerifiedUseCase } from '../application/use-cases/mark-contact-verified.use-case';

@Controller()
export class VerificationEventsController {
  constructor(private readonly markVerified: MarkContactVerifiedUseCase) {}

  @EventPattern(VERIFICATION_EVENTS.CONTACT_VERIFIED)
  async onContactVerified(
    @Payload() event: ContactVerifiedEvent,
  ): Promise<void> {
    await this.markVerified.execute({
      userId: event.userId,
      channel: event.channel,
    });
  }
}

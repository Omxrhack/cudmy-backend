import {
  CodeExpiredError,
  InvalidCodeError,
  NoActiveCodeError,
  TooManyAttemptsError,
} from '../../domain/errors/verification-domain.errors';
import { VerificationCodeRepository } from '../../domain/ports/verification-code.repository';
import { Channel } from '../../domain/value-objects/channel.vo';
import { VerifyCodeInput, VerifyCodeOutput } from '../dtos/verification.dtos';
import { Clock } from '../ports/clock.port';
import { CodeHasher } from '../ports/code-hasher.port';
import { ContactVerifiedPublisher } from '../ports/contact-verified.publisher.port';

export class VerifyCodeUseCase {
  constructor(
    private readonly codes: VerificationCodeRepository,
    private readonly hasher: CodeHasher,
    private readonly clock: Clock,
    private readonly publisher: ContactVerifiedPublisher,
    private readonly maxAttempts: number,
  ) {}

  async execute(input: VerifyCodeInput): Promise<VerifyCodeOutput> {
    const channel = new Channel(input.channel).value;
    const active = await this.codes.findActive(input.userId, channel);
    if (!active) {
      throw new NoActiveCodeError();
    }
    if (active.isExpired(this.clock.now())) {
      throw new CodeExpiredError();
    }
    if (!active.hasAttemptsLeft(this.maxAttempts)) {
      throw new TooManyAttemptsError();
    }

    const matches = await this.hasher.verify(active.codeHash, input.code);
    if (!matches) {
      await this.codes.incrementAttempts(active.id);
      if (active.attempts + 1 >= this.maxAttempts) {
        throw new TooManyAttemptsError();
      }
      throw new InvalidCodeError();
    }

    await this.codes.consume(active.id);
    await this.publisher.publish(input.userId, channel);
    return { verified: true, channel };
  }
}

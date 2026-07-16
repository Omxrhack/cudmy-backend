import { Channel } from '../../domain/value-objects/channel.vo';
import { InvalidDestinationError } from '../../domain/errors/verification-domain.errors';
import { ResendCooldownError } from '../../domain/errors/verification-domain.errors';
import { VerificationCodeRepository } from '../../domain/ports/verification-code.repository';
import {
  RequestCodeInput,
  RequestCodeOutput,
  OtpPolicy,
} from '../dtos/verification.dtos';
import { Clock } from '../ports/clock.port';
import { CodeGenerator } from '../ports/code-generator.port';
import { CodeHasher } from '../ports/code-hasher.port';
import { Notifier } from '../ports/notifier.port';

export class RequestVerificationCodeUseCase {
  constructor(
    private readonly codes: VerificationCodeRepository,
    private readonly generator: CodeGenerator,
    private readonly hasher: CodeHasher,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
    private readonly policy: OtpPolicy,
  ) {}

  async execute(input: RequestCodeInput): Promise<RequestCodeOutput> {
    const channel = new Channel(input.channel).value;
    const destination = (input.destination ?? '').trim();
    if (!destination) {
      throw new InvalidDestinationError();
    }

    const now = this.clock.now();
    const active = await this.codes.findActive(input.userId, channel);
    if (active && active.isWithinCooldown(now, this.policy.cooldownMs)) {
      const elapsed = now.getTime() - active.createdAt.getTime();
      const remaining = Math.ceil((this.policy.cooldownMs - elapsed) / 1000);
      throw new ResendCooldownError(remaining);
    }

    const code = this.generator.generate(this.policy.codeLength);
    const codeHash = await this.hasher.hash(code);
    const expiresAt = new Date(now.getTime() + this.policy.ttlMs);

    await this.codes.createInvalidatingPrevious({
      userId: input.userId,
      channel,
      destination,
      codeHash,
      expiresAt,
    });
    await this.notifier.send({ channel, destination, code });

    return { channel, expiresAt };
  }
}

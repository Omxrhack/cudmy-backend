import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import {
  AUTH_EVENTS,
  RequestCodeRequest,
  RequestCodeResponse,
  UserRegisteredEvent,
  VERIFICATION_PATTERNS,
  VerifyCodeRequest,
  VerifyCodeResponse,
} from '@app/common';
import { RequestVerificationCodeUseCase } from '../application/use-cases/request-verification-code.use-case';
import { VerifyCodeUseCase } from '../application/use-cases/verify-code.use-case';

@Controller()
export class VerificationController {
  constructor(
    private readonly requestCode: RequestVerificationCodeUseCase,
    private readonly verifyCodeUseCase: VerifyCodeUseCase,
  ) {}

  @MessagePattern(VERIFICATION_PATTERNS.REQUEST)
  async request(
    @Payload() data: RequestCodeRequest,
  ): Promise<RequestCodeResponse> {
    const result = await this.requestCode.execute(data);
    return {
      channel: result.channel,
      expiresAt: result.expiresAt.toISOString(),
    };
  }

  @MessagePattern(VERIFICATION_PATTERNS.VERIFY)
  verify(@Payload() data: VerifyCodeRequest): Promise<VerifyCodeResponse> {
    return this.verifyCodeUseCase.execute(data);
  }

  /** Al registrarse un usuario, se auto-envía código a los canales disponibles. */
  @EventPattern(AUTH_EVENTS.USER_REGISTERED)
  async onUserRegistered(@Payload() event: UserRegisteredEvent): Promise<void> {
    await Promise.allSettled([
      this.requestCode.execute({
        userId: event.userId,
        channel: 'email',
        destination: event.email,
      }),
      this.requestCode.execute({
        userId: event.userId,
        channel: 'sms',
        destination: event.phoneNumber,
      }),
    ]);
  }
}

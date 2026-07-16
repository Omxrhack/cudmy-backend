import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NATS_EVENTS_CLIENT } from '@app/common';
import { Clock } from './application/ports/clock.port';
import { CodeGenerator } from './application/ports/code-generator.port';
import { CodeHasher } from './application/ports/code-hasher.port';
import { ContactVerifiedPublisher } from './application/ports/contact-verified.publisher.port';
import { Notifier } from './application/ports/notifier.port';
import { RequestVerificationCodeUseCase } from './application/use-cases/request-verification-code.use-case';
import { VerifyCodeUseCase } from './application/use-cases/verify-code.use-case';
import { VerificationCodeRepository } from './domain/ports/verification-code.repository';
import { validateVerificationEnv } from './infrastructure/config/env.validation';
import { SystemClock } from './infrastructure/clock/system-clock';
import { CryptoCodeGenerator } from './infrastructure/generator/crypto-code-generator';
import { NatsContactVerifiedPublisher } from './infrastructure/messaging/nats-contact-verified.publisher';
import { CompositeNotifier } from './infrastructure/notifier/composite.notifier';
import { ConsoleNotifier } from './infrastructure/notifier/console.notifier';
import { MemoryNotifier } from './infrastructure/notifier/memory.notifier';
import { KnexService } from './infrastructure/persistence/knex/knex.service';
import { VerificationCodeKnexRepository } from './infrastructure/persistence/knex/verification-code.knex.repository';
import { Argon2CodeHasher } from './infrastructure/security/argon2-code-hasher';
import { VerificationController } from './presentation/verification.controller';

function buildNotifier(provider: string): Notifier {
  return provider === 'memory' ? new MemoryNotifier() : new ConsoleNotifier();
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateVerificationEnv,
      ignoreEnvFile: process.env.NODE_ENV === 'test',
    }),
    ClientsModule.registerAsync([
      {
        name: NATS_EVENTS_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.NATS,
          options: { servers: [config.getOrThrow<string>('NATS_URL')] },
        }),
      },
    ]),
  ],
  controllers: [VerificationController],
  providers: [
    KnexService,
    {
      provide: VerificationCodeRepository,
      useClass: VerificationCodeKnexRepository,
    },
    { provide: CodeHasher, useClass: Argon2CodeHasher },
    { provide: CodeGenerator, useClass: CryptoCodeGenerator },
    { provide: Clock, useClass: SystemClock },
    {
      provide: ContactVerifiedPublisher,
      useClass: NatsContactVerifiedPublisher,
    },
    {
      provide: Notifier,
      useFactory: (config: ConfigService) =>
        new CompositeNotifier({
          sms: buildNotifier(config.get<string>('SMS_PROVIDER', 'console')),
          email: buildNotifier(config.get<string>('EMAIL_PROVIDER', 'console')),
        }),
      inject: [ConfigService],
    },
    {
      provide: RequestVerificationCodeUseCase,
      useFactory: (
        codes: VerificationCodeRepository,
        generator: CodeGenerator,
        hasher: CodeHasher,
        notifier: Notifier,
        clock: Clock,
        config: ConfigService,
      ) =>
        new RequestVerificationCodeUseCase(
          codes,
          generator,
          hasher,
          notifier,
          clock,
          {
            ttlMs: Number(config.getOrThrow<string>('OTP_TTL_SECONDS')) * 1000,
            codeLength: Number(config.getOrThrow<string>('OTP_CODE_LENGTH')),
            maxAttempts: Number(config.getOrThrow<string>('OTP_MAX_ATTEMPTS')),
            cooldownMs:
              Number(config.getOrThrow<string>('OTP_RESEND_COOLDOWN_SECONDS')) *
              1000,
          },
        ),
      inject: [
        VerificationCodeRepository,
        CodeGenerator,
        CodeHasher,
        Notifier,
        Clock,
        ConfigService,
      ],
    },
    {
      provide: VerifyCodeUseCase,
      useFactory: (
        codes: VerificationCodeRepository,
        hasher: CodeHasher,
        clock: Clock,
        publisher: ContactVerifiedPublisher,
        config: ConfigService,
      ) =>
        new VerifyCodeUseCase(
          codes,
          hasher,
          clock,
          publisher,
          Number(config.getOrThrow<string>('OTP_MAX_ATTEMPTS')),
        ),
      inject: [
        VerificationCodeRepository,
        CodeHasher,
        Clock,
        ContactVerifiedPublisher,
        ConfigService,
      ],
    },
  ],
})
export class VerificationModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NATS_EVENTS_CLIENT } from '@app/common';
import { PasswordHasher } from './application/ports/password-hasher.port';
import { TokenService } from './application/ports/token-service.port';
import { UserRegisteredPublisher } from './application/ports/user-registered.publisher.port';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { MarkContactVerifiedUseCase } from './application/use-cases/mark-contact-verified.use-case';
import { RefreshTokensUseCase } from './application/use-cases/refresh-tokens.use-case';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { RefreshTokenRepository } from './domain/ports/refresh-token.repository';
import { UserRepository } from './domain/ports/user.repository';
import { validateAuthEnv } from './infrastructure/config/env.validation';
import { NatsUserRegisteredPublisher } from './infrastructure/messaging/nats-user-registered.publisher';
import { KnexService } from './infrastructure/persistence/knex/knex.service';
import { RefreshTokenKnexRepository } from './infrastructure/persistence/knex/refresh-token.knex.repository';
import { UserKnexRepository } from './infrastructure/persistence/knex/user.knex.repository';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';
import { JwtTokenService } from './infrastructure/security/jwt-token.service';
import { AuthController } from './presentation/auth.controller';
import { VerificationEventsController } from './presentation/verification-events.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateAuthEnv,
      // En tests el entorno se inyecta por process.env (Testcontainers); ignora el .env local.
      ignoreEnvFile: process.env.NODE_ENV === 'test',
    }),
    // Los secretos/TTL se pasan por-firma en JwtTokenService (access vs refresh).
    JwtModule.register({}),
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
  controllers: [AuthController, VerificationEventsController],
  providers: [
    KnexService,
    // Puertos (clase abstracta) -> adaptadores concretos.
    { provide: UserRepository, useClass: UserKnexRepository },
    { provide: RefreshTokenRepository, useClass: RefreshTokenKnexRepository },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: TokenService, useClass: JwtTokenService },
    { provide: UserRegisteredPublisher, useClass: NatsUserRegisteredPublisher },
    // Casos de uso: clases puras registradas por factory (application sin NestJS).
    {
      provide: RegisterUseCase,
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        tokens: TokenService,
        refreshTokens: RefreshTokenRepository,
        userRegistered: UserRegisteredPublisher,
      ) =>
        new RegisterUseCase(
          users,
          hasher,
          tokens,
          refreshTokens,
          userRegistered,
        ),
      inject: [
        UserRepository,
        PasswordHasher,
        TokenService,
        RefreshTokenRepository,
        UserRegisteredPublisher,
      ],
    },
    {
      provide: LoginUseCase,
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        tokens: TokenService,
        refreshTokens: RefreshTokenRepository,
      ) => new LoginUseCase(users, hasher, tokens, refreshTokens),
      inject: [
        UserRepository,
        PasswordHasher,
        TokenService,
        RefreshTokenRepository,
      ],
    },
    {
      provide: RefreshTokensUseCase,
      useFactory: (
        refreshTokens: RefreshTokenRepository,
        tokens: TokenService,
        users: UserRepository,
        hasher: PasswordHasher,
      ) => new RefreshTokensUseCase(refreshTokens, tokens, users, hasher),
      inject: [
        RefreshTokenRepository,
        TokenService,
        UserRepository,
        PasswordHasher,
      ],
    },
    {
      provide: LogoutUseCase,
      useFactory: (
        refreshTokens: RefreshTokenRepository,
        tokens: TokenService,
      ) => new LogoutUseCase(refreshTokens, tokens),
      inject: [RefreshTokenRepository, TokenService],
    },
    {
      provide: MarkContactVerifiedUseCase,
      useFactory: (users: UserRepository) =>
        new MarkContactVerifiedUseCase(users),
      inject: [UserRepository],
    },
  ],
  exports: [RegisterUseCase, LoginUseCase, RefreshTokensUseCase, LogoutUseCase],
})
export class AuthModule {}

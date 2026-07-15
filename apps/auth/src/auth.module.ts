import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PasswordHasher } from './application/ports/password-hasher.port';
import { TokenService } from './application/ports/token-service.port';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { RefreshTokensUseCase } from './application/use-cases/refresh-tokens.use-case';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { RefreshTokenRepository } from './domain/ports/refresh-token.repository';
import { UserRepository } from './domain/ports/user.repository';
import { validateAuthEnv } from './infrastructure/config/env.validation';
import { KnexService } from './infrastructure/persistence/knex/knex.service';
import { RefreshTokenKnexRepository } from './infrastructure/persistence/knex/refresh-token.knex.repository';
import { UserKnexRepository } from './infrastructure/persistence/knex/user.knex.repository';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';
import { JwtTokenService } from './infrastructure/security/jwt-token.service';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateAuthEnv }),
    // Los secretos/TTL se pasan por-firma en JwtTokenService (access vs refresh).
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    KnexService,
    // Puertos (clase abstracta) -> adaptadores concretos.
    { provide: UserRepository, useClass: UserKnexRepository },
    { provide: RefreshTokenRepository, useClass: RefreshTokenKnexRepository },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: TokenService, useClass: JwtTokenService },
    // Casos de uso: clases puras registradas por factory (application sin NestJS).
    {
      provide: RegisterUseCase,
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        tokens: TokenService,
        refreshTokens: RefreshTokenRepository,
      ) => new RegisterUseCase(users, hasher, tokens, refreshTokens),
      inject: [
        UserRepository,
        PasswordHasher,
        TokenService,
        RefreshTokenRepository,
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
  ],
  exports: [RegisterUseCase, LoginUseCase, RefreshTokensUseCase, LogoutUseCase],
})
export class AuthModule {}

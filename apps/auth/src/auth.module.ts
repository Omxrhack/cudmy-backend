import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PasswordHasher } from './application/ports/password-hasher.port';
import { TokenService } from './application/ports/token-service.port';
import { RefreshTokenRepository } from './domain/ports/refresh-token.repository';
import { UserRepository } from './domain/ports/user.repository';
import { validateAuthEnv } from './infrastructure/config/env.validation';
import { KnexService } from './infrastructure/persistence/knex/knex.service';
import { RefreshTokenKnexRepository } from './infrastructure/persistence/knex/refresh-token.knex.repository';
import { UserKnexRepository } from './infrastructure/persistence/knex/user.knex.repository';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';
import { JwtTokenService } from './infrastructure/security/jwt-token.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateAuthEnv }),
    // Los secretos/TTL se pasan por-firma en JwtTokenService (access vs refresh).
    JwtModule.register({}),
  ],
  providers: [
    KnexService,
    // Puertos (clase abstracta) -> adaptadores concretos.
    { provide: UserRepository, useClass: UserKnexRepository },
    { provide: RefreshTokenRepository, useClass: RefreshTokenKnexRepository },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: TokenService, useClass: JwtTokenService },
  ],
})
export class AuthModule {}

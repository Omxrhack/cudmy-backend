import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
  SignedRefreshToken,
  TokenService,
} from '../../application/ports/token-service.port';

@Injectable()
export class JwtTokenService extends TokenService {
  private readonly accessSecret: string;
  private readonly accessTtl: string;
  private readonly refreshSecret: string;
  private readonly refreshTtl: string;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    super();
    this.accessSecret = config.getOrThrow<string>('ACCESS_TOKEN_SECRET');
    this.accessTtl = config.getOrThrow<string>('ACCESS_TOKEN_TTL');
    this.refreshSecret = config.getOrThrow<string>('REFRESH_TOKEN_SECRET');
    this.refreshTtl = config.getOrThrow<string>('REFRESH_TOKEN_TTL');
  }

  signAccess(payload: AccessTokenPayload): Promise<string> {
    return this.jwt.signAsync(
      { email: payload.email, roles: payload.roles },
      // expiresIn se tipa como StringValue (ms); el TTL viene de env como string.
      {
        subject: payload.sub,
        secret: this.accessSecret,
        expiresIn: this.accessTtl,
      } as JwtSignOptions,
    );
  }

  async signRefresh(sub: string): Promise<SignedRefreshToken> {
    const jti = randomUUID();
    const token = await this.jwt.signAsync({}, {
      subject: sub,
      jwtid: jti,
      secret: this.refreshSecret,
      expiresIn: this.refreshTtl,
    } as JwtSignOptions);
    const { exp } = this.jwt.decode<{ exp: number }>(token);
    return { token, jti, expiresAt: new Date(exp * 1000) };
  }

  async verifyRefresh(token: string): Promise<RefreshTokenPayload | null> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; jti: string }>(
        token,
        { secret: this.refreshSecret },
      );
      return { sub: payload.sub, jti: payload.jti };
    } catch {
      return null;
    }
  }
}

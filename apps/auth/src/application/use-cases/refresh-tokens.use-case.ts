import {
  InvalidRefreshTokenError,
  RefreshTokenReuseError,
} from '../../domain/errors/auth-domain.errors';
import { RefreshTokenRepository } from '../../domain/ports/refresh-token.repository';
import { UserRepository } from '../../domain/ports/user.repository';
import { AuthTokens, RefreshCommand } from '../dtos/auth.dtos';
import { PasswordHasher } from '../ports/password-hasher.port';
import { TokenService } from '../ports/token-service.port';

export class RefreshTokensUseCase {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokens: TokenService,
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(cmd: RefreshCommand): Promise<AuthTokens> {
    const payload = await this.tokens.verifyRefresh(cmd.refreshToken);
    if (!payload) {
      throw new InvalidRefreshTokenError();
    }

    // Firmamos el nuevo refresh antes de reclamar: necesitamos su jti para replaced_by.
    const newRefresh = await this.tokens.signRefresh(payload.sub);
    const outcome = await this.refreshTokens.claimForRotation(
      payload.jti,
      newRefresh.jti,
    );

    if (outcome.status === 'not_found') {
      throw new InvalidRefreshTokenError();
    }
    if (outcome.status === 'reuse') {
      // Replay de un token ya consumido: se revocan todas las sesiones del usuario.
      await this.refreshTokens.revokeAllForUser(outcome.userId);
      throw new RefreshTokenReuseError();
    }

    // outcome.status === 'rotated': verificamos que el token crudo case con el hash.
    const matches = await this.hasher.verify(
      outcome.token.tokenHash,
      cmd.refreshToken,
    );
    if (!matches) {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new InvalidRefreshTokenError();
    }

    const accessToken = await this.tokens.signAccess({
      sub: user.id,
      email: user.email.raw,
      roles: user.roles,
    });
    const tokenHash = await this.hasher.hash(newRefresh.token);
    await this.refreshTokens.create({
      userId: user.id,
      jti: newRefresh.jti,
      tokenHash,
      expiresAt: newRefresh.expiresAt,
    });

    return { accessToken, refreshToken: newRefresh.token };
  }
}

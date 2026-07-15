import { RefreshTokenRepository } from '../../domain/ports/refresh-token.repository';
import { LogoutCommand } from '../dtos/auth.dtos';
import { TokenService } from '../ports/token-service.port';

export class LogoutUseCase {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokens: TokenService,
  ) {}

  /** Idempotente: cerrar sesión con un token inválido/expirado es un no-op. */
  async execute(cmd: LogoutCommand): Promise<void> {
    const payload = await this.tokens.verifyRefresh(cmd.refreshToken);
    if (!payload) {
      return;
    }

    if (cmd.allSessions) {
      await this.refreshTokens.revokeAllForUser(payload.sub);
    } else {
      await this.refreshTokens.revokeByJti(payload.jti);
    }
  }
}

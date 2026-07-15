import { User } from '../../domain/entities/user.entity';
import { RefreshTokenRepository } from '../../domain/ports/refresh-token.repository';
import { AuthTokens } from '../dtos/auth.dtos';
import { PasswordHasher } from '../ports/password-hasher.port';
import { TokenService } from '../ports/token-service.port';

export interface SessionDeps {
  tokens: TokenService;
  hasher: PasswordHasher;
  refreshTokens: RefreshTokenRepository;
}

/**
 * Emite un par access+refresh para un usuario y persiste el refresh token
 * hasheado (argon2) con su jti. Compartido por Register y Login.
 */
export async function issueSession(
  user: User,
  deps: SessionDeps,
): Promise<AuthTokens> {
  const accessToken = await deps.tokens.signAccess({
    sub: user.id,
    email: user.email.raw,
    roles: user.roles,
  });

  const refresh = await deps.tokens.signRefresh(user.id);
  const tokenHash = await deps.hasher.hash(refresh.token);
  await deps.refreshTokens.create({
    userId: user.id,
    jti: refresh.jti,
    tokenHash,
    expiresAt: refresh.expiresAt,
  });

  return { accessToken, refreshToken: refresh.token };
}

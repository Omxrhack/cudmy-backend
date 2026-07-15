import { InvalidCredentialsError } from '../../domain/errors/auth-domain.errors';
import { RefreshTokenRepository } from '../../domain/ports/refresh-token.repository';
import { UserRepository } from '../../domain/ports/user.repository';
import { Email } from '../../domain/value-objects/email.vo';
import { AuthTokens, LoginCommand } from '../dtos/auth.dtos';
import { PasswordHasher } from '../ports/password-hasher.port';
import { TokenService } from '../ports/token-service.port';
import { issueSession } from './issue-session';

export class LoginUseCase {
  /** Hash argon2id de un valor fijo: se verifica cuando el email no existe para
   * no filtrar la existencia del usuario por diferencia de tiempo. */
  private static readonly DUMMY_HASH =
    '$argon2id$v=19$m=65536,t=3,p=4$nfCmyfiXT1r9eYEIGwfTbA$sETGv61z84/f/Adk1DJ6mooMR+wiTo6GUBrMxjfnJ08';

  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async execute(cmd: LoginCommand): Promise<AuthTokens> {
    const email = new Email(cmd.email);
    const user = await this.users.findByEmail(email);

    if (!user) {
      await this.hasher.verify(LoginUseCase.DUMMY_HASH, cmd.password);
      throw new InvalidCredentialsError();
    }

    const valid = await this.hasher.verify(user.passwordHash.raw, cmd.password);
    if (!valid) {
      throw new InvalidCredentialsError();
    }

    return issueSession(user, {
      tokens: this.tokens,
      hasher: this.hasher,
      refreshTokens: this.refreshTokens,
    });
  }
}

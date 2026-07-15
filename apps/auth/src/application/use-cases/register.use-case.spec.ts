import { User } from '../../domain/entities/user.entity';
import { EmailAlreadyInUseError } from '../../domain/errors/auth-domain.errors';
import { RefreshTokenRepository } from '../../domain/ports/refresh-token.repository';
import { UserRepository } from '../../domain/ports/user.repository';
import { Email } from '../../domain/value-objects/email.vo';
import { HashedPassword } from '../../domain/value-objects/hashed-password.vo';
import { PasswordHasher } from '../ports/password-hasher.port';
import { TokenService } from '../ports/token-service.port';
import { RegisterUseCase } from './register.use-case';

function buildUser(): User {
  return new User({
    id: 'user-1',
    email: new Email('a@b.com'),
    passwordHash: new HashedPassword('$argon2id$hash'),
    roles: ['student'],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('RegisterUseCase', () => {
  let users: jest.Mocked<UserRepository>;
  let refreshTokens: jest.Mocked<RefreshTokenRepository>;
  let hasher: jest.Mocked<PasswordHasher>;
  let tokens: jest.Mocked<TokenService>;
  let useCase: RegisterUseCase;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    refreshTokens = {
      create: jest.fn(),
      findByJti: jest.fn(),
      claimForRotation: jest.fn(),
      revokeByJti: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    hasher = {
      hash: jest.fn(),
      verify: jest.fn(),
    };
    tokens = {
      signAccess: jest.fn(),
      signRefresh: jest.fn(),
      verifyRefresh: jest.fn(),
    };
    useCase = new RegisterUseCase(users, hasher, tokens, refreshTokens);
  });

  it('registra un usuario nuevo y emite tokens', async () => {
    users.findByEmail.mockResolvedValue(null);
    hasher.hash.mockResolvedValue('$argon2id$hash');
    users.create.mockResolvedValue(buildUser());
    tokens.signAccess.mockResolvedValue('access-token');
    tokens.signRefresh.mockResolvedValue({
      token: 'refresh-token',
      jti: 'jti-1',
      expiresAt: new Date(Date.now() + 10_000),
    });

    const result = await useCase.execute({
      email: 'a@b.com',
      password: 'password123',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user).toEqual({
      id: 'user-1',
      email: 'a@b.com',
      roles: ['student'],
    });
    expect(users.create).toHaveBeenCalledTimes(1);
    expect(refreshTokens.create).toHaveBeenCalledWith(
      expect.objectContaining({ jti: 'jti-1', userId: 'user-1' }),
    );
  });

  it('rechaza un email ya registrado', async () => {
    users.findByEmail.mockResolvedValue(buildUser());

    await expect(
      useCase.execute({ email: 'a@b.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(EmailAlreadyInUseError);
    expect(users.create).not.toHaveBeenCalled();
  });
});

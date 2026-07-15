import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { User } from '../../domain/entities/user.entity';
import {
  InvalidRefreshTokenError,
  RefreshTokenReuseError,
} from '../../domain/errors/auth-domain.errors';
import { RefreshTokenRepository } from '../../domain/ports/refresh-token.repository';
import { UserRepository } from '../../domain/ports/user.repository';
import { Address } from '../../domain/value-objects/address.vo';
import { Email } from '../../domain/value-objects/email.vo';
import { HashedPassword } from '../../domain/value-objects/hashed-password.vo';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';
import { PasswordHasher } from '../ports/password-hasher.port';
import { TokenService } from '../ports/token-service.port';
import { RefreshTokensUseCase } from './refresh-tokens.use-case';

function buildUser(): User {
  return new User({
    id: 'user-1',
    email: new Email('a@b.com'),
    passwordHash: new HashedPassword('$argon2id$stored'),
    roles: ['student'],
    firstName: 'Ada',
    lastName: 'Lovelace',
    phoneNumber: new PhoneNumber('+5215555555555'),
    address: new Address({
      street: 'Calle 1',
      extNumber: '10',
      neighborhood: 'Centro',
      city: 'CDMX',
      state: 'CDMX',
      postalCode: '01000',
      country: 'MX',
    }),
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function buildStoredToken(): RefreshToken {
  return new RefreshToken({
    id: 'rt-1',
    userId: 'user-1',
    tokenHash: 'stored-hash',
    jti: 'old-jti',
    expiresAt: new Date(Date.now() + 10_000),
    revokedAt: new Date(),
    replacedBy: 'new-jti',
    createdAt: new Date(),
  });
}

describe('RefreshTokensUseCase', () => {
  let users: jest.Mocked<UserRepository>;
  let refreshTokens: jest.Mocked<RefreshTokenRepository>;
  let hasher: jest.Mocked<PasswordHasher>;
  let tokens: jest.Mocked<TokenService>;
  let useCase: RefreshTokensUseCase;

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
    useCase = new RefreshTokensUseCase(refreshTokens, tokens, users, hasher);
  });

  function arrangeValidVerify() {
    tokens.verifyRefresh.mockResolvedValue({ sub: 'user-1', jti: 'old-jti' });
    tokens.signRefresh.mockResolvedValue({
      token: 'new-refresh',
      jti: 'new-jti',
      expiresAt: new Date(Date.now() + 10_000),
    });
  }

  it('rota el token: revoca el viejo (replaced_by) y emite un par nuevo', async () => {
    arrangeValidVerify();
    refreshTokens.claimForRotation.mockResolvedValue({
      status: 'rotated',
      token: buildStoredToken(),
    });
    hasher.verify.mockResolvedValue(true);
    users.findById.mockResolvedValue(buildUser());
    tokens.signAccess.mockResolvedValue('new-access');
    hasher.hash.mockResolvedValue('new-hash');

    const result = await useCase.execute({ refreshToken: 'raw-old' });

    expect(result).toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    expect(refreshTokens.claimForRotation).toHaveBeenCalledWith(
      'old-jti',
      'new-jti',
    );
    expect(refreshTokens.create).toHaveBeenCalledWith(
      expect.objectContaining({ jti: 'new-jti', userId: 'user-1' }),
    );
  });

  it('detecta reúso: revoca TODAS las sesiones y lanza RefreshTokenReuseError', async () => {
    arrangeValidVerify();
    refreshTokens.claimForRotation.mockResolvedValue({
      status: 'reuse',
      userId: 'user-1',
    });

    await expect(
      useCase.execute({ refreshToken: 'raw-reused' }),
    ).rejects.toBeInstanceOf(RefreshTokenReuseError);
    expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith('user-1');
    expect(refreshTokens.create).not.toHaveBeenCalled();
  });

  it('jti inexistente lanza InvalidRefreshTokenError', async () => {
    arrangeValidVerify();
    refreshTokens.claimForRotation.mockResolvedValue({ status: 'not_found' });

    await expect(
      useCase.execute({ refreshToken: 'raw-unknown' }),
    ).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    expect(refreshTokens.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('firma/expiración inválida lanza InvalidRefreshTokenError sin tocar la BD', async () => {
    tokens.verifyRefresh.mockResolvedValue(null);

    await expect(
      useCase.execute({ refreshToken: 'garbage' }),
    ).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    expect(refreshTokens.claimForRotation).not.toHaveBeenCalled();
  });

  it('hash que no coincide lanza InvalidRefreshTokenError', async () => {
    arrangeValidVerify();
    refreshTokens.claimForRotation.mockResolvedValue({
      status: 'rotated',
      token: buildStoredToken(),
    });
    hasher.verify.mockResolvedValue(false);

    await expect(
      useCase.execute({ refreshToken: 'raw-tampered' }),
    ).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    expect(refreshTokens.create).not.toHaveBeenCalled();
  });
});

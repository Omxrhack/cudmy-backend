import { User } from '../../domain/entities/user.entity';
import { InvalidCredentialsError } from '../../domain/errors/auth-domain.errors';
import { RefreshTokenRepository } from '../../domain/ports/refresh-token.repository';
import { UserRepository } from '../../domain/ports/user.repository';
import { Address } from '../../domain/value-objects/address.vo';
import { Email } from '../../domain/value-objects/email.vo';
import { HashedPassword } from '../../domain/value-objects/hashed-password.vo';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';
import { PasswordHasher } from '../ports/password-hasher.port';
import { TokenService } from '../ports/token-service.port';
import { LoginUseCase } from './login.use-case';

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

describe('LoginUseCase', () => {
  let users: jest.Mocked<UserRepository>;
  let refreshTokens: jest.Mocked<RefreshTokenRepository>;
  let hasher: jest.Mocked<PasswordHasher>;
  let tokens: jest.Mocked<TokenService>;
  let useCase: LoginUseCase;

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
    useCase = new LoginUseCase(users, hasher, tokens, refreshTokens);
  });

  it('emite tokens con credenciales válidas', async () => {
    users.findByEmail.mockResolvedValue(buildUser());
    hasher.verify.mockResolvedValue(true);
    hasher.hash.mockResolvedValue('refresh-hash');
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

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('con email inexistente lanza InvalidCredentials y ejecuta verify dummy (anti-enumeración)', async () => {
    users.findByEmail.mockResolvedValue(null);
    hasher.verify.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'nope@b.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    // Se verifica contra un hash dummy aunque el usuario no exista.
    expect(hasher.verify).toHaveBeenCalledTimes(1);
    expect(tokens.signAccess).not.toHaveBeenCalled();
  });

  it('con contraseña incorrecta lanza InvalidCredentials', async () => {
    users.findByEmail.mockResolvedValue(buildUser());
    hasher.verify.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'a@b.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});

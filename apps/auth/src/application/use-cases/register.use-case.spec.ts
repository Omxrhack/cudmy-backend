import { User } from '../../domain/entities/user.entity';
import {
  EmailAlreadyInUseError,
  InvalidAddressError,
  InvalidPhoneNumberError,
} from '../../domain/errors/auth-domain.errors';
import { RefreshTokenRepository } from '../../domain/ports/refresh-token.repository';
import { UserRepository } from '../../domain/ports/user.repository';
import { Address } from '../../domain/value-objects/address.vo';
import { Email } from '../../domain/value-objects/email.vo';
import { HashedPassword } from '../../domain/value-objects/hashed-password.vo';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';
import { PasswordHasher } from '../ports/password-hasher.port';
import { TokenService } from '../ports/token-service.port';
import { RegisterCommand } from '../dtos/auth.dtos';
import { RegisterUseCase } from './register.use-case';

function buildAddress(): Address {
  return new Address({
    street: 'Calle 1',
    extNumber: '10',
    neighborhood: 'Centro',
    city: 'CDMX',
    state: 'CDMX',
    postalCode: '01000',
    country: 'MX',
  });
}

function buildUser(): User {
  return new User({
    id: 'user-1',
    email: new Email('a@b.com'),
    passwordHash: new HashedPassword('$argon2id$hash'),
    roles: ['student'],
    firstName: 'Ada',
    lastName: 'Lovelace',
    phoneNumber: new PhoneNumber('+5215555555555'),
    address: buildAddress(),
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

const validCommand: RegisterCommand = {
  email: 'a@b.com',
  password: 'password123',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phoneNumber: '+5215555555555',
  address: {
    street: 'Calle 1',
    extNumber: '10',
    neighborhood: 'Centro',
    city: 'CDMX',
    state: 'CDMX',
    postalCode: '01000',
    country: 'MX',
  },
};

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

    const result = await useCase.execute(validCommand);

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user).toEqual({
      id: 'user-1',
      email: 'a@b.com',
      roles: ['student'],
      firstName: 'Ada',
      lastName: 'Lovelace',
      phoneNumber: '+5215555555555',
      emailVerified: false,
      phoneVerified: false,
    });
    expect(users.create).toHaveBeenCalledTimes(1);
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Ada', roles: ['student'] }),
    );
    expect(refreshTokens.create).toHaveBeenCalledWith(
      expect.objectContaining({ jti: 'jti-1', userId: 'user-1' }),
    );
  });

  it('rechaza un email ya registrado', async () => {
    users.findByEmail.mockResolvedValue(buildUser());

    await expect(useCase.execute(validCommand)).rejects.toBeInstanceOf(
      EmailAlreadyInUseError,
    );
    expect(users.create).not.toHaveBeenCalled();
  });

  it('rechaza un teléfono con formato inválido', async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ ...validCommand, phoneNumber: '12345' }),
    ).rejects.toBeInstanceOf(InvalidPhoneNumberError);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('rechaza una dirección incompleta', async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({
        ...validCommand,
        address: { ...validCommand.address, city: '' },
      }),
    ).rejects.toBeInstanceOf(InvalidAddressError);
    expect(users.create).not.toHaveBeenCalled();
  });
});

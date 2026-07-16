import { User } from '../../domain/entities/user.entity';
import {
  EmailAlreadyInUseError,
  InvalidNameError,
} from '../../domain/errors/auth-domain.errors';
import { RefreshTokenRepository } from '../../domain/ports/refresh-token.repository';
import { UserRepository } from '../../domain/ports/user.repository';
import { Address } from '../../domain/value-objects/address.vo';
import { Email } from '../../domain/value-objects/email.vo';
import { HashedPassword } from '../../domain/value-objects/hashed-password.vo';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';
import { RegisterCommand, RegisterResult } from '../dtos/auth.dtos';
import { PasswordHasher } from '../ports/password-hasher.port';
import { TokenService } from '../ports/token-service.port';
import { UserRegisteredPublisher } from '../ports/user-registered.publisher.port';
import { issueSession } from './issue-session';

export class RegisterUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly userRegistered: UserRegisteredPublisher,
  ) {}

  async execute(cmd: RegisterCommand): Promise<RegisterResult> {
    const email = new Email(cmd.email);
    const firstName = (cmd.firstName ?? '').trim();
    const lastName = (cmd.lastName ?? '').trim();
    if (!firstName) throw new InvalidNameError('firstName');
    if (!lastName) throw new InvalidNameError('lastName');
    const phoneNumber = new PhoneNumber(cmd.phoneNumber);
    const address = new Address(cmd.address);

    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new EmailAlreadyInUseError(email.raw);
    }

    const passwordHash = new HashedPassword(
      await this.hasher.hash(cmd.password),
    );
    const user = await this.users.create({
      email,
      passwordHash,
      roles: User.DEFAULT_ROLES,
      firstName,
      lastName,
      phoneNumber,
      address,
    });

    const session = await issueSession(user, {
      tokens: this.tokens,
      hasher: this.hasher,
      refreshTokens: this.refreshTokens,
    });

    await this.userRegistered.publish({
      userId: user.id,
      email: user.email.raw,
      phoneNumber: user.phoneNumber.raw,
    });

    return {
      ...session,
      user: {
        id: user.id,
        email: user.email.raw,
        roles: user.roles,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber.raw,
        emailVerified: user.isEmailVerified,
        phoneVerified: user.isPhoneVerified,
      },
    };
  }
}

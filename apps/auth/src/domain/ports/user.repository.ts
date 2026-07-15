import { Role, User } from '../entities/user.entity';
import { Address } from '../value-objects/address.vo';
import { Email } from '../value-objects/email.vo';
import { HashedPassword } from '../value-objects/hashed-password.vo';
import { PhoneNumber } from '../value-objects/phone-number.vo';

/** Datos para crear un usuario nuevo (id y timestamps los asigna la BD). */
export interface NewUser {
  email: Email;
  passwordHash: HashedPassword;
  roles: Role[];
  firstName: string;
  lastName: string;
  phoneNumber: PhoneNumber;
  address: Address;
}

/** Canal de contacto que puede marcarse como verificado. */
export type VerifiedChannel = 'email' | 'sms';

/** Puerto de persistencia de usuarios (implementado en infraestructura). */
export abstract class UserRepository {
  abstract findByEmail(email: Email): Promise<User | null>;
  abstract findById(id: string): Promise<User | null>;
  abstract create(data: NewUser): Promise<User>;
  /** Marca el email o el teléfono del usuario como verificado (idempotente). */
  abstract markVerified(userId: string, channel: VerifiedChannel): Promise<void>;
}

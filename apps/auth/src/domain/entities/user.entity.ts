import { Address } from '../value-objects/address.vo';
import { Email } from '../value-objects/email.vo';
import { HashedPassword } from '../value-objects/hashed-password.vo';
import { PhoneNumber } from '../value-objects/phone-number.vo';

/** Roles de usuario de la plataforma (un usuario puede tener varios). */
export type Role = 'student' | 'instructor' | 'admin';

export interface UserProps {
  id: string;
  email: Email;
  passwordHash: HashedPassword;
  roles: Role[];
  firstName: string;
  lastName: string;
  phoneNumber: PhoneNumber;
  address: Address;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Entidad de dominio User. */
export class User {
  static readonly DEFAULT_ROLES: Role[] = ['student'];

  readonly id: string;
  readonly email: Email;
  readonly passwordHash: HashedPassword;
  readonly roles: Role[];
  readonly firstName: string;
  readonly lastName: string;
  readonly phoneNumber: PhoneNumber;
  readonly address: Address;
  readonly emailVerifiedAt: Date | null;
  readonly phoneVerifiedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.roles = props.roles;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.phoneNumber = props.phoneNumber;
    this.address = props.address;
    this.emailVerifiedAt = props.emailVerifiedAt;
    this.phoneVerifiedAt = props.phoneVerifiedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  get isEmailVerified(): boolean {
    return this.emailVerifiedAt !== null;
  }

  get isPhoneVerified(): boolean {
    return this.phoneVerifiedAt !== null;
  }
}

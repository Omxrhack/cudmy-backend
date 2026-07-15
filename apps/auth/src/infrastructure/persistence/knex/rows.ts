import { RefreshToken } from '../../../domain/entities/refresh-token.entity';
import { Role, User } from '../../../domain/entities/user.entity';
import { Address } from '../../../domain/value-objects/address.vo';
import { Email } from '../../../domain/value-objects/email.vo';
import { HashedPassword } from '../../../domain/value-objects/hashed-password.vo';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.vo';

/** Forma de fila de la tabla `users` (snake_case). */
export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  roles: string[];
  first_name: string;
  last_name: string;
  phone_number: string;
  email_verified_at: Date | null;
  phone_verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** Forma de fila de la tabla `addresses` (snake_case). */
export interface AddressRow {
  id: string;
  user_id: string;
  street: string;
  ext_number: string;
  int_number: string | null;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  created_at: Date;
  updated_at: Date;
}

/** Forma de fila de la tabla `refresh_tokens` (snake_case). */
export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  jti: string;
  expires_at: Date;
  revoked_at: Date | null;
  replaced_by: string | null;
  created_at: Date;
}

export function toAddress(row: AddressRow): Address {
  return new Address({
    street: row.street,
    extNumber: row.ext_number,
    intNumber: row.int_number,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
  });
}

export function toUser(row: UserRow, addressRow: AddressRow): User {
  return new User({
    id: row.id,
    email: new Email(row.email),
    passwordHash: new HashedPassword(row.password_hash),
    roles: row.roles as Role[],
    firstName: row.first_name,
    lastName: row.last_name,
    phoneNumber: new PhoneNumber(row.phone_number),
    address: toAddress(addressRow),
    emailVerifiedAt: row.email_verified_at,
    phoneVerifiedAt: row.phone_verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function toRefreshToken(row: RefreshTokenRow): RefreshToken {
  return new RefreshToken({
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    jti: row.jti,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    replacedBy: row.replaced_by,
    createdAt: row.created_at,
  });
}

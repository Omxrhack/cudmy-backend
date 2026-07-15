import { RefreshToken } from '../../../domain/entities/refresh-token.entity';
import { Role, User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { HashedPassword } from '../../../domain/value-objects/hashed-password.vo';

/** Forma de fila de la tabla `users` (snake_case). */
export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  roles: string[];
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

export function toUser(row: UserRow): User {
  return new User({
    id: row.id,
    email: new Email(row.email),
    passwordHash: new HashedPassword(row.password_hash),
    roles: row.roles as Role[],
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

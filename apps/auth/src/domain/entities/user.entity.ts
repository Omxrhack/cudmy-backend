import { Email } from '../value-objects/email.vo';
import { HashedPassword } from '../value-objects/hashed-password.vo';

/** Roles de usuario de la plataforma (un usuario puede tener varios). */
export type Role = 'student' | 'instructor' | 'admin';

export interface UserProps {
  id: string;
  email: Email;
  passwordHash: HashedPassword;
  roles: Role[];
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
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.roles = props.roles;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}

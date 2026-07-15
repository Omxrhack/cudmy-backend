import { Role, User } from '../entities/user.entity';
import { Email } from '../value-objects/email.vo';
import { HashedPassword } from '../value-objects/hashed-password.vo';

/** Datos para crear un usuario nuevo (id y timestamps los asigna la BD). */
export interface NewUser {
  email: Email;
  passwordHash: HashedPassword;
  roles: Role[];
}

/** Puerto de persistencia de usuarios (implementado en infraestructura). */
export abstract class UserRepository {
  abstract findByEmail(email: Email): Promise<User | null>;
  abstract findById(id: string): Promise<User | null>;
  abstract create(data: NewUser): Promise<User>;
}

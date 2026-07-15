import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entities/user.entity';
import { EmailAlreadyInUseError } from '../../../domain/errors/auth-domain.errors';
import { NewUser, UserRepository } from '../../../domain/ports/user.repository';
import { Email } from '../../../domain/value-objects/email.vo';
import { KnexService } from './knex.service';
import { toUser, UserRow } from './rows';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class UserKnexRepository extends UserRepository {
  constructor(private readonly db: KnexService) {
    super();
  }

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.db
      .knex<UserRow>('users')
      .where({ email: email.raw })
      .first();
    return row ? toUser(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.knex<UserRow>('users').where({ id }).first();
    return row ? toUser(row) : null;
  }

  async create(data: NewUser): Promise<User> {
    try {
      const [row] = await this.db
        .knex<UserRow>('users')
        .insert({
          email: data.email.raw,
          password_hash: data.passwordHash.raw,
          roles: data.roles,
        })
        .returning('*');
      return toUser(row);
    } catch (err) {
      // Cierra la ventana TOCTOU del check-then-insert de email.
      if (this.isUniqueViolation(err)) {
        throw new EmailAlreadyInUseError(data.email.raw);
      }
      throw err;
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === PG_UNIQUE_VIOLATION
    );
  }
}

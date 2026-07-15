import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entities/user.entity';
import { EmailAlreadyInUseError } from '../../../domain/errors/auth-domain.errors';
import {
  NewUser,
  UserRepository,
  VerifiedChannel,
} from '../../../domain/ports/user.repository';
import { Email } from '../../../domain/value-objects/email.vo';
import { KnexService } from './knex.service';
import { AddressRow, toUser, UserRow } from './rows';

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
    return row ? this.hydrate(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.knex<UserRow>('users').where({ id }).first();
    return row ? this.hydrate(row) : null;
  }

  async create(data: NewUser): Promise<User> {
    try {
      return await this.db.knex.transaction(async (trx) => {
        const [userRow] = await trx<UserRow>('users')
          .insert({
            email: data.email.raw,
            password_hash: data.passwordHash.raw,
            roles: data.roles,
            first_name: data.firstName,
            last_name: data.lastName,
            phone_number: data.phoneNumber.raw,
          })
          .returning('*');

        const [addressRow] = await trx<AddressRow>('addresses')
          .insert({
            user_id: userRow.id,
            street: data.address.street,
            ext_number: data.address.extNumber,
            int_number: data.address.intNumber,
            neighborhood: data.address.neighborhood,
            city: data.address.city,
            state: data.address.state,
            postal_code: data.address.postalCode,
            country: data.address.country,
          })
          .returning('*');

        return toUser(userRow, addressRow);
      });
    } catch (err) {
      // Cierra la ventana TOCTOU del check-then-insert de email.
      if (this.isUniqueViolation(err)) {
        throw new EmailAlreadyInUseError(data.email.raw);
      }
      throw err;
    }
  }

  async markVerified(userId: string, channel: VerifiedChannel): Promise<void> {
    const column =
      channel === 'email' ? 'email_verified_at' : 'phone_verified_at';
    await this.db
      .knex<UserRow>('users')
      .where({ id: userId })
      .update({ [column]: new Date() });
  }

  private async hydrate(row: UserRow): Promise<User> {
    const addressRow = await this.db
      .knex<AddressRow>('addresses')
      .where({ user_id: row.id })
      .first();
    if (!addressRow) {
      throw new Error(`El usuario ${row.id} no tiene dirección asociada`);
    }
    return toUser(row, addressRow);
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

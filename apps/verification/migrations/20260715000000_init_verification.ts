import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  await knex.schema.createTable('verification_codes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable(); // sin FK: BD separada de auth
    table.text('channel').notNullable();
    table.text('destination').notNullable();
    table.text('code_hash').notNullable();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('consumed_at', { useTz: true }).nullable();
    table.integer('attempts').notNullable().defaultTo(0);
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(['user_id', 'channel'], 'idx_verification_codes_user_channel');
  });

  await knex.raw(
    "ALTER TABLE verification_codes ADD CONSTRAINT chk_verification_channel CHECK (channel IN ('sms', 'email'))",
  );
  // Un único código activo por (user, canal).
  await knex.raw(
    'CREATE UNIQUE INDEX uq_verification_active ON verification_codes (user_id, channel) WHERE consumed_at IS NULL',
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('verification_codes');
}

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // gen_random_uuid() vive en pgcrypto.
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('email').notNullable().unique();
    table.text('password_hash').notNullable();
    table
      .specificType('roles', 'text[]')
      .notNullable()
      .defaultTo(knex.raw(`'{student}'::text[]`));
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.text('token_hash').notNullable();
    table.text('jti').notNullable().unique();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('revoked_at', { useTz: true }).nullable();
    table.text('replaced_by').nullable();
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(['user_id'], 'idx_refresh_tokens_user_id');
    table.index(
      ['user_id', 'revoked_at'],
      'idx_refresh_tokens_user_id_revoked_at',
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.dropTableIfExists('users');
}

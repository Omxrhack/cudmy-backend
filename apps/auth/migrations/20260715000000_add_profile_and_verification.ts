import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Columnas de perfil + flags de verificación en users.
  // Default temporal '' para tolerar filas existentes; se quita al final.
  await knex.schema.alterTable('users', (table) => {
    table.text('first_name').notNullable().defaultTo('');
    table.text('last_name').notNullable().defaultTo('');
    table.text('phone_number').notNullable().defaultTo('');
    table.timestamp('email_verified_at', { useTz: true }).nullable();
    table.timestamp('phone_verified_at', { useTz: true }).nullable();
  });
  await knex.raw('ALTER TABLE users ALTER COLUMN first_name DROP DEFAULT');
  await knex.raw('ALTER TABLE users ALTER COLUMN last_name DROP DEFAULT');
  await knex.raw('ALTER TABLE users ALTER COLUMN phone_number DROP DEFAULT');

  // Dirección 1:1 con users.
  await knex.schema.createTable('addresses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.text('street').notNullable();
    table.text('ext_number').notNullable();
    table.text('int_number').nullable();
    table.text('neighborhood').notNullable();
    table.text('city').notNullable();
    table.text('state').notNullable();
    table.text('postal_code').notNullable();
    table.text('country').notNullable().defaultTo('MX');
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('addresses');
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('first_name');
    table.dropColumn('last_name');
    table.dropColumn('phone_number');
    table.dropColumn('email_verified_at');
    table.dropColumn('phone_verified_at');
  });
}

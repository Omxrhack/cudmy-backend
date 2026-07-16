import * as path from 'node:path';
import * as dotenv from 'dotenv';
import type { Knex } from 'knex';

// Knex hace chdir al dir del knexfile; cargamos el .env de la raíz por ruta absoluta.
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config: Knex.Config = {
  client: 'pg',
  connection: process.env.VERIFICATION_DATABASE_URL,
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    extension: 'ts',
    tableName: 'knex_migrations',
  },
};

export default config;

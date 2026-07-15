import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import knexFactory, { Knex } from 'knex';

/** Provee y administra el ciclo de vida de la conexión Knex del microservicio auth. */
@Injectable()
export class KnexService implements OnModuleDestroy {
  readonly knex: Knex;

  constructor(config: ConfigService) {
    this.knex = knexFactory({
      client: 'pg',
      connection: config.getOrThrow<string>('DATABASE_URL'),
      pool: { min: 0, max: 10 },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.knex.destroy();
  }
}

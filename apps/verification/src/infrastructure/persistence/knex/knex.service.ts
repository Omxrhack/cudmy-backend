import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import knexFactory, { Knex } from 'knex';

/** Conexión Knex del microservicio de verificación (BD propia). */
@Injectable()
export class KnexService implements OnModuleDestroy {
  readonly knex: Knex;

  constructor(config: ConfigService) {
    this.knex = knexFactory({
      client: 'pg',
      connection: config.getOrThrow<string>('VERIFICATION_DATABASE_URL'),
      pool: { min: 0, max: 10 },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.knex.destroy();
  }
}

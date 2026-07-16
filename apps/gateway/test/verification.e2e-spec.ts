import {
  INestApplication,
  INestMicroservice,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import knexFactory, { Knex } from 'knex';
import request from 'supertest';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { up as initAuth } from '../../auth/migrations/20260714000000_init_auth';
import { up as addProfile } from '../../auth/migrations/20260715000000_add_profile_and_verification';
import { up as initVerification } from '../../verification/migrations/20260715000000_init_verification';
import type { MemoryNotifier as MemoryNotifierType } from '../../verification/src/infrastructure/notifier/memory.notifier';

jest.setTimeout(180_000);

async function waitFor<T>(
  fn: () => Promise<T | undefined | null> | T | undefined | null,
  timeoutMs = 6000,
  stepMs = 100,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await fn();
    if (value !== undefined && value !== null) return value;
    if (Date.now() > deadline) throw new Error('waitFor: timeout');
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
}

describe('Verification flow (e2e)', () => {
  let pg: StartedPostgreSqlContainer;
  let nats: StartedTestContainer;
  let authApp: INestMicroservice;
  let verificationApp: INestMicroservice;
  let gateway: INestApplication;
  let http: ReturnType<typeof request>;
  let db: Knex;
  let MemoryNotifier: typeof MemoryNotifierType;

  const email = `ver_${Date.now()}@cudmy.test`;
  const password = 'Sup3rSecret!';
  const registerBody = {
    email,
    password,
    confirmPassword: password,
    firstName: 'Ada',
    lastName: 'Lovelace',
    phoneNumber: '+5215555555555',
    address: {
      street: 'Calle 1',
      extNumber: '10',
      neighborhood: 'Centro',
      city: 'CDMX',
      state: 'CDMX',
      postalCode: '01000',
      country: 'MX',
    },
  };

  beforeAll(async () => {
    pg = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('cudmy_auth')
      .withUsername('cudmy')
      .withPassword('cudmy')
      .start();
    nats = await new GenericContainer('nats:2-alpine')
      .withExposedPorts(4222)
      .withWaitStrategy(Wait.forLogMessage(/Server is ready/))
      .start();

    const databaseUrl = pg.getConnectionUri();
    const natsUrl = `nats://${nats.getHost()}:${nats.getMappedPort(4222)}`;

    // En el e2e verification reutiliza la misma BD del contenedor (sus tablas no colisionan).
    const migrationDb = knexFactory({ client: 'pg', connection: databaseUrl });
    await initAuth(migrationDb);
    await addProfile(migrationDb);
    await initVerification(migrationDb);
    await migrationDb.destroy();

    process.env.DATABASE_URL = databaseUrl;
    process.env.VERIFICATION_DATABASE_URL = databaseUrl;
    process.env.NATS_URL = natsUrl;
    process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
    process.env.ACCESS_TOKEN_TTL = '15m';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
    process.env.REFRESH_TOKEN_TTL = '7d';
    process.env.GATEWAY_PORT = '0';
    process.env.OTP_TTL_SECONDS = '600';
    process.env.OTP_CODE_LENGTH = '6';
    process.env.OTP_MAX_ATTEMPTS = '5';
    process.env.OTP_RESEND_COOLDOWN_SECONDS = '60';
    process.env.SMS_PROVIDER = 'memory';
    process.env.EMAIL_PROVIDER = 'memory';

    // Import diferido tras fijar process.env (ConfigModule valida al importar).
    const { AuthModule } = await import('../../auth/src/auth.module');
    const { AuthRpcExceptionFilter } = await import(
      '../../auth/src/presentation/auth-rpc-exception.filter'
    );
    const { VerificationModule } = await import(
      '../../verification/src/verification.module'
    );
    const { VerificationRpcExceptionFilter } = await import(
      '../../verification/src/presentation/verification-rpc-exception.filter'
    );
    const { GatewayModule } = await import('../src/gateway.module');
    const { RpcToHttpExceptionFilter } = await import(
      '../src/common/rpc-to-http.filter'
    );
    ({ MemoryNotifier } = await import(
      '../../verification/src/infrastructure/notifier/memory.notifier'
    ));
    MemoryNotifier.clear();

    authApp = await NestFactory.createMicroservice<MicroserviceOptions>(
      AuthModule,
      { transport: Transport.NATS, options: { servers: [natsUrl] }, logger: false },
    );
    authApp.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    authApp.useGlobalFilters(new AuthRpcExceptionFilter());
    await authApp.listen();

    verificationApp = await NestFactory.createMicroservice<MicroserviceOptions>(
      VerificationModule,
      { transport: Transport.NATS, options: { servers: [natsUrl] }, logger: false },
    );
    verificationApp.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    verificationApp.useGlobalFilters(new VerificationRpcExceptionFilter());
    await verificationApp.listen();

    gateway = await NestFactory.create(GatewayModule, { logger: false });
    gateway.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    gateway.useGlobalFilters(new RpcToHttpExceptionFilter());
    await gateway.init();

    http = request(gateway.getHttpServer());
    db = knexFactory({ client: 'pg', connection: databaseUrl });

    await new Promise((resolve) => setTimeout(resolve, 800));
  });

  afterAll(async () => {
    await gateway?.close();
    await verificationApp?.close();
    await authApp?.close();
    await db?.destroy();
    await nats?.stop();
    await pg?.stop();
  });

  it('el registro auto-envía OTP y al verificar marca el email como verificado en auth', async () => {
    const register = await http.post('/auth/register').send(registerBody);
    expect(register.status).toBe(201);
    const accessToken = register.body.accessToken as string;
    const userId = register.body.user.id as string;

    // El evento user.registered auto-envía el código (capturado por MemoryNotifier).
    const emailNote = await waitFor(() => MemoryNotifier.last('email'));
    expect(emailNote.destination).toBe(email);

    const verify = await http
      .post('/verification/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ channel: 'email', code: emailNote.code });
    expect(verify.status).toBe(200);
    expect(verify.body.verified).toBe(true);

    // El evento contact.verified marca users.email_verified_at (asíncrono).
    const verifiedAt = await waitFor(async () => {
      const row = await db('users').where({ id: userId }).first();
      return row?.email_verified_at ?? null;
    });
    expect(verifiedAt).toBeTruthy();
  });

  it('un código incorrecto para un canal activo -> 400 INVALID_CODE', async () => {
    const login = await http.post('/auth/login').send({ email, password });
    const accessToken = login.body.accessToken as string;

    // El canal SMS tiene un código activo (auto-enviado en el registro).
    const bad = await http
      .post('/verification/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ channel: 'sms', code: '000000' });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe('INVALID_CODE');
  });

  it('reenviar dentro del cooldown -> 429 RESEND_COOLDOWN', async () => {
    const login = await http.post('/auth/login').send({ email, password });
    const accessToken = login.body.accessToken as string;

    const resend = await http
      .post('/verification/request')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ channel: 'sms' });
    expect(resend.status).toBe(429);
    expect(resend.body.error).toBe('RESEND_COOLDOWN');
  });
});

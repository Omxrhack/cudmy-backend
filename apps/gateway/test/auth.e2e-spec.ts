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
import knexFactory from 'knex';
import request from 'supertest';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { up as initAuth } from '../../auth/migrations/20260714000000_init_auth';
import { up as addProfile } from '../../auth/migrations/20260715000000_add_profile_and_verification';

jest.setTimeout(180_000);

describe('Auth flow (e2e)', () => {
  let pg: StartedPostgreSqlContainer;
  let nats: StartedTestContainer;
  let authApp: INestMicroservice;
  let gateway: INestApplication;
  let http: ReturnType<typeof request>;

  const email = `e2e_${Date.now()}@cudmy.test`;
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

    const migrationDb = knexFactory({ client: 'pg', connection: databaseUrl });
    await initAuth(migrationDb);
    await addProfile(migrationDb);
    await migrationDb.destroy();

    process.env.DATABASE_URL = databaseUrl;
    process.env.NATS_URL = natsUrl;
    process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
    process.env.ACCESS_TOKEN_TTL = '15m';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
    process.env.REFRESH_TOKEN_TTL = '7d';
    process.env.GATEWAY_PORT = '0';

    // Import diferido: ConfigModule.forRoot valida el entorno al importar el
    // módulo, así que debe cargarse DESPUÉS de fijar process.env.
    const { AuthModule } = await import('../../auth/src/auth.module');
    const { AuthRpcExceptionFilter } =
      await import('../../auth/src/presentation/auth-rpc-exception.filter');
    const { GatewayModule } = await import('../src/gateway.module');
    const { RpcToHttpExceptionFilter } =
      await import('../src/common/rpc-to-http.filter');

    authApp = await NestFactory.createMicroservice<MicroserviceOptions>(
      AuthModule,
      {
        transport: Transport.NATS,
        options: { servers: [natsUrl] },
        logger: false,
      },
    );
    authApp.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    authApp.useGlobalFilters(new AuthRpcExceptionFilter());
    await authApp.listen();

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

    // Da tiempo a que NATS propague las suscripciones del microservicio auth.
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await gateway?.close();
    await authApp?.close();
    await nats?.stop();
    await pg?.stop();
  });

  it('completa el flujo register -> login -> refresh -> logout con rotación y detección de reúso', async () => {
    const register = await http.post('/auth/register').send(registerBody);
    expect(register.status).toBe(201);
    expect(register.body.accessToken).toBeDefined();
    expect(register.body.refreshToken).toBeDefined();
    expect(register.body.user.roles).toEqual(['student']);
    expect(register.body.user.firstName).toBe('Ada');
    expect(register.body.user.lastName).toBe('Lovelace');
    expect(register.body.user.phoneNumber).toBe('+5215555555555');
    expect(register.body.user.emailVerified).toBe(false);
    expect(register.body.user.phoneVerified).toBe(false);

    const me = await http
      .get('/auth/me')
      .set('Authorization', `Bearer ${register.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(email);
    expect(me.body.emailVerified).toBe(false);
    expect(me.body.phoneVerified).toBe(false);

    const badMe = await http
      .get('/auth/me')
      .set('Authorization', 'Bearer garbage.token');
    expect(badMe.status).toBe(401);

    const login = await http.post('/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    const rt2 = login.body.refreshToken as string;

    const refresh = await http
      .post('/auth/refresh')
      .send({ refreshToken: rt2 });
    expect(refresh.status).toBe(200);
    const rt3 = refresh.body.refreshToken as string;
    expect(rt3).not.toBe(rt2);

    // reúso del token ya rotado -> revoca todas las sesiones
    const reuse = await http.post('/auth/refresh').send({ refreshToken: rt2 });
    expect(reuse.status).toBe(401);
    expect(reuse.body.error).toBe('REFRESH_TOKEN_REUSE');

    // rt3 quedó revocado por la cascada de reúso
    const afterReuse = await http
      .post('/auth/refresh')
      .send({ refreshToken: rt3 });
    expect(afterReuse.status).toBe(401);

    // login fresco + logout
    const relogin = await http.post('/auth/login').send({ email, password });
    const rt4 = relogin.body.refreshToken as string;
    const logout = await http.post('/auth/logout').send({ refreshToken: rt4 });
    expect(logout.status).toBe(204);

    const afterLogout = await http
      .post('/auth/refresh')
      .send({ refreshToken: rt4 });
    expect(afterLogout.status).toBe(401);
  });

  it('mapea los errores de dominio a status HTTP', async () => {
    const dup = await http.post('/auth/register').send(registerBody);
    expect(dup.status).toBe(409);
    expect(dup.body.error).toBe('EMAIL_ALREADY_IN_USE');

    const bad = await http
      .post('/auth/login')
      .send({ email, password: 'wrongwrong' });
    expect(bad.status).toBe(401);

    // DTO inválido (falta perfil/dirección) -> 400
    const invalid = await http
      .post('/auth/register')
      .send({ email: 'not-an-email' });
    expect(invalid.status).toBe(400);

    // confirmPassword no coincide -> 400
    const mismatch = await http.post('/auth/register').send({
      ...registerBody,
      email: `mismatch_${Date.now()}@cudmy.test`,
      confirmPassword: 'otra-cosa',
    });
    expect(mismatch.status).toBe(400);
  });
});

# cudmy-backend

Backend de la plataforma de cursos **Cudmy** (tipo Udemy). Monorepo NestJS con
Clean Architecture y microservicios sobre NATS. El primer microservicio es
**auth** (registro, login, refresh con rotación y logout).

> Contexto completo de arquitectura, convenciones y decisiones en [`CLAUDE.md`](./CLAUDE.md).

## Stack

NestJS (monorepo nativo) · NATS · Knex + PostgreSQL · argon2 · JWT · class-validator ·
`@nestjs/config` · pnpm · Jest.

## Estructura

```
apps/
  gateway/   # API HTTP pública; reenvía a los microservicios por NATS
  auth/      # Microservicio de autenticación (NATS) + migraciones Knex
libs/
  common/    # Contratos compartidos: patrones NATS, códigos de error, tokens DI
```

## Requisitos

- Node.js >= 20
- pnpm (`corepack enable`)
- Docker (para Postgres + NATS y para los tests e2e)

## Puesta en marcha

```bash
# 1. Variables de entorno
cp .env.example .env         # ajusta secretos y POSTGRES_PORT si el 5432 está ocupado

# 2. Dependencias
pnpm install

# 3. Infraestructura local (Postgres + NATS)
docker compose up -d

# 4. Migraciones de la BD de auth (Knex)
pnpm db:migrate

# 5. Levantar los servicios (en dos terminales)
pnpm start:dev auth
pnpm start:dev gateway
```

El gateway queda en `http://localhost:${GATEWAY_PORT:-3000}` (health en `GET /health`).

## API (a través del gateway)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Crea usuario y devuelve `{ accessToken, refreshToken, user }` |
| POST | `/auth/login` | Devuelve `{ accessToken, refreshToken }` |
| POST | `/auth/refresh` | Rota el refresh token; `{ accessToken, refreshToken }` |
| POST | `/auth/logout` | Revoca el refresh token (`allSessions` opcional) |
| GET | `/auth/me` | Ruta protegida (requiere `Authorization: Bearer <access>`) |

Ejemplo:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"alumno@cudmy.mx","password":"Sup3rSecret!"}'
```

## Scripts útiles

```bash
pnpm build          # compila gateway + auth
pnpm lint           # ESLint (incluye la regla de fronteras de Clean Architecture)
pnpm test           # tests unitarios (no requiere Docker)
pnpm test:e2e       # e2e del flujo completo (requiere Docker: Testcontainers)
pnpm db:migrate     # aplica migraciones Knex
pnpm db:rollback    # revierte la última migración
pnpm db:make <n>    # crea una migración nueva
```

## Seguridad de tokens

- **Access token** (JWT, ~15m): payload `{ sub, email, roles }`, validado localmente en el gateway.
- **Refresh token** (JWT, ~7d): guardado **hasheado** (argon2) con su `jti`; **rotación** en cada
  refresh y **detección de reúso** (si se reusa un token revocado se revocan todas las sesiones del usuario).

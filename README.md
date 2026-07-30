# cudmy-backend

Backend de la plataforma de cursos **Cudmy** (tipo Udemy). Monorepo NestJS con
Clean Architecture y microservicios sobre NATS. Microservicios actuales:
**auth** (registro con perfil, login, refresh con rotación, logout) y
**verification** (OTP por SMS/correo).

> Contexto completo de arquitectura, convenciones y decisiones en [`CLAUDE.md`](./CLAUDE.md).

## Stack

NestJS (monorepo nativo) · NATS · Knex + PostgreSQL · argon2 · JWT · class-validator ·
`@nestjs/config` · pnpm · Jest.

## Estructura

```
apps/
  gateway/       # API HTTP pública; reenvía a los microservicios por NATS
  auth/          # Autenticación + perfil (NATS) + migraciones Knex
  verification/  # OTP por SMS/correo (NATS) + BD propia
libs/
  common/        # Contratos compartidos: patrones/eventos NATS, códigos de error, tokens DI
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

# 3. Infraestructura local (Postgres + NATS). Crea cudmy_auth y cudmy_verification.
docker compose up -d

# 4. Migraciones (auth + verification)
pnpm db:migrate

# 5. Levantar los servicios (en tres terminales)
pnpm start:dev auth
pnpm start:dev verification
pnpm start:dev gateway
```

El gateway queda en `http://localhost:${GATEWAY_PORT:-3000}` (health en `GET /health`).

## API (a través del gateway)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Crea usuario (perfil + dirección) y devuelve `{ accessToken, refreshToken, user }` |
| POST | `/auth/login` | Devuelve `{ accessToken, refreshToken }` |
| POST | `/auth/refresh` | Rota el refresh token; `{ accessToken, refreshToken }` |
| POST | `/auth/logout` | Revoca el refresh token (`allSessions` opcional) |
| GET | `/auth/me` | Ruta protegida (requiere `Authorization: Bearer <access>`) |
| POST | `/verification/request` | Reenvía código OTP (`{ channel: 'email' \| 'sms' }`, protegida) |
| POST | `/verification/verify` | Verifica código (`{ channel, code }`, protegida) |

Registro (nota: `confirmPassword` se valida en el gateway y no se persiste):

```bash
curl -X POST http://localhost:3000/auth/register \
  -H 'content-type: application/json' \
  -d '{
    "email": "alumno@cudmy.mx",
    "password": "Sup3rSecret!",
    "confirmPassword": "Sup3rSecret!",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "phoneNumber": "+5216181234567",
    "address": {
      "street": "Av. Siempre Viva", "extNumber": "742", "neighborhood": "Centro",
      "city": "Culiacán", "state": "Sinaloa", "postalCode": "80000", "country": "MX"
    }
  }'
```

Verificación (con el `accessToken` del registro/login):

```bash
# Al registrarse se auto-envía el OTP. Con SMS_PROVIDER/EMAIL_PROVIDER=console el código sale en el log del servicio verification.
curl -X POST http://localhost:3000/verification/verify \
  -H "Authorization: Bearer <accessToken>" -H 'content-type: application/json' \
  -d '{"channel":"email","code":"123456"}'
```

## Scripts útiles

```bash
pnpm build                    # compila gateway + auth + verification
pnpm lint                     # ESLint (incluye fronteras de Clean Architecture)
pnpm test                     # tests unitarios (no requiere Docker)
pnpm test:e2e                 # e2e (requiere Docker: Testcontainers)
pnpm db:migrate               # migraciones auth + verification
pnpm db:migrate:auth          # solo auth
pnpm db:migrate:verification  # solo verification
pnpm db:make:auth <n>         # nueva migración (auth)
```

## Seguridad de tokens y verificación

- **Access token** (JWT, ~15m): payload `{ sub, email, roles, phoneNumber, emailVerified, phoneVerified }`, validado localmente en el gateway.
- **Refresh token** (JWT, ~7d): guardado **hasheado** (argon2) con su `jti`; **rotación** en cada refresh y **detección de reúso** (si se reusa un token revocado se revocan todas las sesiones del usuario).
- **Verificación**: login permitido sin verificar; el estado viaja en el token. OTP de 6 dígitos hasheado, TTL 10m, máx. 5 intentos, cooldown 60s. Entrega *stub* (`console`) lista para Twilio (SMS) / SMTP (correo) vía `SMS_PROVIDER`/`EMAIL_PROVIDER`.

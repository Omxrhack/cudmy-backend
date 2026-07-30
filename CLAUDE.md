# CLAUDE.md — cudmy-backend

> Archivo de contexto persistente para Claude Code. Se carga automáticamente al inicio de cada sesión en la raíz del repo. **Mantenlo actualizado**: cada cambio relevante de arquitectura o cada feature terminada se registra en la sección "Bitácora".

---

## 1. Contexto del proyecto

Backend de una **plataforma de cursos en línea tipo Udemy**: aloja **todo tipo de cursos** (no un catálogo fijo), con **categorías dinámicas y extensibles**. Nace del proyecto Ducky Ducky School, pero el modelo NO se limita a sus 6 cursos originales (Inglés, Robótica, Programación, Diseño Web/3D, Roblox, Chino); esos son solo cursos/categorías de ejemplo, no el alcance.

**Nada de dominio debe hardcodear categorías ni tipos de curso.** Las categorías se modelan como datos (entidad `Category` o tags), nunca como un enum cerrado.

**Roles de usuario:** `student`, `instructor`, `admin`. Un mismo usuario puede ser `student` e `instructor` a la vez (por eso `roles` es un arreglo). Los instructores crean y publican cursos; los alumnos se inscriben.

> **Decisión pendiente de confirmar (afecta el modelo de datos de cursos):** ¿marketplace multiinstructor (cualquier instructor publica/vende, como Udemy) o solo la institución publica cursos de muchos temas? Se asume **marketplace multiinstructor** hasta confirmar. El microservicio `auth` es agnóstico a esto salvo por incluir el rol `instructor`.

> El backlog original (44 HU / 13 épicas) está pensado para una escuela presencial (asistencia, planeación de clases, docentes). Con el modelo Udemy el set de features cambia (autoría de cursos, secciones/lecciones, inscripción, reseñas, progreso autodirigido). **Reconciliar qué historias siguen aplicando antes de diseñar el microservicio de cursos.**

Este repo (`cudmy-backend`) es el backend de toda la plataforma.

**Estrategia de entrega:** microservicios incrementales. El primero es **auth**.

---

## 2. Stack

| Área | Elección | Nota |
|---|---|---|
| Framework | **NestJS** | Monorepo nativo (`nest g app`) |
| Arquitectura | **Clean Architecture** | Regla de dependencias hacia el dominio |
| Estilo | **Microservicios** | API Gateway HTTP + servicios por dominio |
| Transporte inter-servicios | **NATS** | Request-response y eventos, ligero |
| Acceso a datos | **Knex** (query builder) | Consultas SQL tipadas a mano; sin ORM. Repos en `infrastructure` implementan los puertos del dominio |
| Migraciones | **Knex** (`knex migrate`) | Migraciones versionadas en `apps/auth/migrations/` |
| Base de datos | **PostgreSQL** (driver `pg`) | Una BD por microservicio |
| Hashing de contraseñas | **argon2** | (Fallback: `bcrypt` si el build nativo estorba) |
| Tokens | **JWT** (`@nestjs/jwt`) | Access + Refresh |
| Validación | **class-validator** + **class-transformer** | vía `ValidationPipe` global (solo en el borde HTTP) |
| Config | **@nestjs/config** + validación de env | |
| Gestor de paquetes | **pnpm** | Un solo `package.json` raíz (monorepo nativo Nest) |
| Módulos TS | **commonjs** / target ES2023 | Requerido por el monorepo Nest + decoradores |
| Testing | **Jest** | Unit (use cases) + e2e (gateway, con Testcontainers) |
| Infra local | **docker-compose** | postgres + nats |

---

## 3. Arquitectura limpia — regla de dependencias

Las dependencias apuntan **hacia adentro**. Nada del dominio conoce a NestJS, Knex ni HTTP.

```
presentation ──► application ──► domain
      │                │
      └──► infrastructure ──► (implementa puertos de application/domain)
```

- **domain**: entidades, value objects, errores de dominio y **puertos** (interfaces de repositorio). Sin decoradores de framework.
- **application**: casos de uso (una clase por caso de uso), DTOs y **puertos** hacia servicios externos (hasher, token service).
- **infrastructure**: implementaciones de los puertos (Knex, argon2, JWT), config.
- **presentation**: controladores (en microservicios, handlers `@MessagePattern`), mapeo de DTOs.

**Inyección de dependencias:** los puertos se definen como **clases abstractas** (no interfaces TS, que no existen en runtime) y se usan como tokens de DI. En el módulo se hace `{ provide: PuertoAbstracto, useClass: ImplementacionConcreta }`. Los casos de uso se registran como clases **puras** vía `useFactory` + `inject`, de modo que `domain/` y `application/` no importan NestJS. Una regla ESLint (`no-restricted-imports`) refuerza la frontera.

---

## 4. Estructura del monorepo

```
cudmy-backend/
├── apps/
│   ├── gateway/                 # HTTP público; reenvía a microservicios por NATS
│   │   └── src/
│   │       ├── main.ts          # bootstrap HTTP + ValidationPipe global
│   │       ├── gateway.module.ts# ClientProxy NATS (token AUTH_SERVICE)
│   │       ├── auth/            # controladores HTTP de auth (proxy a 'auth.*') + dto/
│   │       └── common/          # guard JWT (valida access token localmente) + exception filter
│   └── auth/                    # Microservicio de autenticación (NATS)
│       ├── knexfile.ts          # config de Knex (lee DATABASE_URL)
│       ├── migrations/          # migraciones Knex (DDL versionado)
│       └── src/
│           ├── main.ts          # createMicroservice(NATS)
│           ├── auth.module.ts   # composition root (bindings + useFactory)
│           ├── domain/
│           │   ├── entities/            # user.entity.ts, refresh-token.entity.ts
│           │   ├── value-objects/       # email.vo.ts, hashed-password.vo.ts
│           │   ├── ports/               # user.repository.ts, refresh-token.repository.ts (abstractas)
│           │   └── errors/              # auth-domain.errors.ts
│           ├── application/
│           │   ├── ports/               # password-hasher.port.ts, token-service.port.ts
│           │   ├── dtos/
│           │   └── use-cases/           # register / login / refresh-tokens / logout
│           ├── infrastructure/
│           │   ├── persistence/knex/    # knex.service.ts + *.knex.repository.ts
│           │   ├── security/            # argon2-password-hasher.ts, jwt-token.service.ts
│           │   └── config/              # env.validation.ts
│           └── presentation/
│               └── auth.controller.ts   # @MessagePattern('auth.*')
├── libs/
│   └── common/                  # DTOs/contratos compartidos, patrones de mensaje NATS, códigos de error, token AUTH_SERVICE
├── docker-compose.yml           # postgres + nats
├── .env.example
├── CLAUDE.md
├── nest-cli.json
├── package.json
└── tsconfig.json
```

> Cada microservicio es dueño de su propia BD. `auth` tiene sus migraciones Knex; el gateway **no** tiene BD.

---

## 5. Microservicio `auth`

### Endpoints (expuestos por el gateway)
| HTTP (gateway) | Patrón NATS | Caso de uso |
|---|---|---|
| `POST /auth/register` | `auth.register` | RegisterUseCase |
| `POST /auth/login` | `auth.login` | LoginUseCase |
| `POST /auth/refresh` | `auth.refresh` | RefreshTokensUseCase |
| `POST /auth/logout` | `auth.logout` | LogoutUseCase |

### Estrategia de tokens
- **Access token**: JWT firmado con `ACCESS_TOKEN_SECRET`, TTL corto (**15m**). Payload: `{ sub, email, roles, phoneNumber, emailVerified, phoneVerified }`. Se **valida en el gateway** con el secreto compartido → sin ida y vuelta al microservicio.

> **Registro ampliado:** `POST /auth/register` recibe `email, password, confirmPassword, firstName, lastName, phoneNumber, address{...}`. `confirmPassword` se valida en el gateway (`@Match`) y **no** viaja por NATS. El registro emite el evento `user.registered` (auto-envío de OTP en el servicio de verificación).
- **Refresh token**: JWT firmado con `REFRESH_TOKEN_SECRET`, TTL largo (**7d**). Se guarda **hasheado** (argon2) en BD con su `jti`.
  - **Rotación**: en cada `refresh` se emite un par nuevo y se marca el anterior como usado (`replaced_by`).
  - **Detección de reúso**: si llega un refresh ya revocado/usado, se revocan **todas** las sesiones de ese usuario.
- **Logout**: revoca el refresh token presentado (`revoked_at`); `allSessions=true` revoca todas.

### Modelo de datos (tablas creadas por migraciones Knex)

**`users`**
| columna | tipo | notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` (extensión `pgcrypto`) |
| `email` | text | `unique not null` |
| `password_hash` | text | `not null` |
| `roles` | text[] | `not null default '{student}'` — valores: `student` \| `instructor` \| `admin` |
| `first_name` | text | `not null` |
| `last_name` | text | `not null` |
| `phone_number` | text | `not null` (E.164) |
| `email_verified_at` | timestamptz | nullable (null = no verificado) |
| `phone_verified_at` | timestamptz | nullable (null = no verificado) |
| `created_at` | timestamptz | `default now()` |
| `updated_at` | timestamptz | |

**`addresses`** (1:1 con `users`)
| columna | tipo | notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid | `unique not null`, FK → `users(id)` `on delete cascade` |
| `street` | text | `not null` (calle) |
| `ext_number` | text | `not null` (número exterior) |
| `int_number` | text | nullable (número interior) |
| `neighborhood` | text | `not null` (colonia) |
| `city` | text | `not null` |
| `state` | text | `not null` |
| `postal_code` | text | `not null` (5 dígitos para MX) |
| `country` | text | `not null default 'MX'` (ISO-3166 alpha-2) |
| `created_at` / `updated_at` | timestamptz | `default now()` |

**`refresh_tokens`**
| columna | tipo | notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid | FK → `users(id)` `on delete cascade` |
| `token_hash` | text | argon2 del refresh JWT crudo |
| `jti` | text | `unique not null` |
| `expires_at` | timestamptz | `not null` |
| `revoked_at` | timestamptz | nullable (null = activo) |
| `replaced_by` | text | nullable (jti del sucesor; cadena de rotación) |
| `created_at` | timestamptz | `default now()` |

Índices: `refresh_tokens(user_id)` y `refresh_tokens(user_id, revoked_at)`.

### Variables de entorno
```
NODE_ENV=development
GATEWAY_PORT=3000
NATS_URL=nats://localhost:4222
DATABASE_URL=postgresql://cudmy:cudmy@localhost:5432/cudmy_auth
POSTGRES_USER=cudmy
POSTGRES_PASSWORD=cudmy
POSTGRES_DB=cudmy_auth
ACCESS_TOKEN_SECRET=...
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_SECRET=...
REFRESH_TOKEN_TTL=7d
```

---

## 5-bis. Microservicio `verification` (OTP)

Verifica **email** y **teléfono** por código OTP. BD propia (`cudmy_verification`).

### Endpoints (gateway, protegidos con `JwtAuthGuard`; `userId`/destino salen del token)
| HTTP (gateway) | Patrón NATS | Caso de uso |
|---|---|---|
| `POST /verification/request` | `verification.request` | RequestVerificationCodeUseCase |
| `POST /verification/verify` | `verification.verify` | VerifyCodeUseCase |

### Flujo (event-driven)
1. auth emite `user.registered` → verification **auto-envía** código a email y SMS.
2. Reenvío manual: `POST /verification/request { channel }` (respeta cooldown).
3. `POST /verification/verify { channel, code }` → al acertar, verification emite `contact.verified { userId, channel }`.
4. auth consume `contact.verified` y fija `users.email_verified_at` / `phone_verified_at`.

> El login sigue permitido sin verificar; el estado viaja en el access token. `emit()` de NATS debe consumirse (`firstValueFrom`). Publicación por puertos de aplicación (`UserRegisteredPublisher`, `ContactVerifiedPublisher`) → adaptador NATS en `infrastructure`.

### Reglas OTP
Código de 6 dígitos, hasheado (argon2), TTL 10m, máx. 5 intentos, cooldown de reenvío 60s, un código activo por (user, canal). Entrega por puerto `Notifier`: `console` (log, default) / `memory` (tests) / `twilio`,`smtp` (a futuro), elegidos por `SMS_PROVIDER`/`EMAIL_PROVIDER`.

### Modelo `verification_codes` (BD `cudmy_verification`)
| columna | tipo | notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid | **sin FK** (BD separada de auth) |
| `channel` | text | `check in ('sms','email')` |
| `destination` | text | email o teléfono |
| `code_hash` | text | argon2 del código |
| `expires_at` | timestamptz | `not null` |
| `consumed_at` | timestamptz | nullable (null = activo) |
| `attempts` | int | `default 0` |
| `created_at` | timestamptz | `default now()` |

Índice `(user_id, channel)` + **unique parcial** `(user_id, channel) where consumed_at is null`.

### Variables de entorno (verification)
```
VERIFICATION_DATABASE_URL=postgresql://cudmy:cudmy@localhost:5432/cudmy_verification
OTP_TTL_SECONDS=600
OTP_CODE_LENGTH=6
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
SMS_PROVIDER=console
EMAIL_PROVIDER=console
```

---

## 6. Convenciones

- **Nombres de archivo**: `kebab-case` con sufijo por rol: `*.use-case.ts`, `*.repository.ts`, `*.vo.ts`, `*.controller.ts`, `*.port.ts`, `*.knex.repository.ts`.
- **Un caso de uso por clase**, con un solo método `execute()`.
- **Errores**: errores de dominio propios (p. ej. `InvalidCredentialsError`); se mapean a respuestas HTTP en el gateway mediante un exception filter. Nunca lanzar `HttpException` desde el dominio o la aplicación.
- **DTOs de entrada**: validados con class-validator en el borde (gateway).
- **Patrones de mensaje NATS**: centralizados como constantes en `libs/common` (no strings mágicos dispersos).
- **Secretos**: solo en `.env` (nunca commiteados). Mantener `.env.example` al día.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`).
- **Tests**: cada caso de uso con test unitario (puertos mockeados); flujos de auth con e2e en el gateway.

---

## 7. Comandos

```bash
# Infra local (postgres + nats)
docker compose up -d

# Instalar
pnpm install

# Migraciones (Knex, por servicio)
pnpm db:migrate                 # auth + verification
pnpm db:migrate:auth            # solo auth
pnpm db:migrate:verification    # solo verification
pnpm db:make:auth <nombre>      # nueva migración (auth)

# Desarrollo
pnpm start:dev gateway
pnpm start:dev auth
pnpm start:dev verification

# Tests / calidad
pnpm test                # unit (sin Docker)
pnpm test:e2e            # e2e (requiere Docker: Testcontainers)
pnpm lint
```

---

## 8. Instrucciones para Claude (mantenimiento de este archivo)

Al trabajar en este repo:
1. **Documenta mientras avanzas.** Al terminar una feature o tomar una decisión de arquitectura, agrega una entrada en la **Bitácora** (sección 9) con fecha, qué se hizo y por qué.
2. Si cambia el stack o la estructura, actualiza las secciones 2–5 (no solo la bitácora).
3. Mantén `.env.example` sincronizado con cualquier variable nueva.
4. Respeta la regla de dependencias de Clean Architecture; si algo la rompe, márcalo explícitamente en la bitácora.

---

## 9. Bitácora de decisiones y avances

> Formato: `AAAA-MM-DD — [tipo] título`. Tipos: DECISIÓN, FEATURE, FIX, DEUDA.

- **2026-07-14 — DECISIÓN — Definición inicial de arquitectura.** Backend en NestJS con Clean Architecture y microservicios. Monorepo nativo de NestJS. Transporte NATS. PostgreSQL (una BD por servicio). argon2 para hashing. pnpm como gestor. Patrón API Gateway HTTP → microservicios.
- **2026-07-14 — DECISIÓN — Estrategia de tokens de auth.** Access token JWT de 15m validado en el gateway; refresh token JWT de 7d, hasheado en BD, con rotación y detección de reúso.
- **2026-07-14 — DECISIÓN — Alcance del producto: plataforma de cursos tipo Udemy.** El backend NO es una escuela con catálogo fijo, sino una plataforma para todo tipo de cursos con categorías dinámicas. Roles ampliados a `student` / `instructor` / `admin`. Nada de dominio hardcodea categorías. *Abierto:* marketplace multiinstructor vs. publicación solo institucional (se asume marketplace). *Deuda:* reconciliar el backlog escolar original con el modelo Udemy antes de diseñar el microservicio de cursos.
- **2026-07-14 — DECISIÓN — Persistencia con Knex, sin ORM.** Se usa **Knex** para migraciones y consultas (query builder), reemplazando por completo a Prisma. Motivo: preferencia del equipo por SQL explícito. Impacto: repos `*.knex.repository.ts` en `infrastructure/persistence/knex`, migraciones en `apps/auth/migrations/`. Actualizadas §2, §4, §5, §7.
- **2026-07-14 — DECISIÓN — Módulos TypeScript en `commonjs`.** El scaffold inicial venía en `nodenext`; se cambió a `commonjs`/`node` (target ES2023) porque `nodenext` rompe los path-mappings del monorepo (`@app/common`), la emisión de metadata de decoradores y la resolución en tsc. No viola la regla de dependencias.
- **2026-07-14 — FEATURE — Fase 1: Scaffold del monorepo.** Migrado a pnpm; apps `gateway` (HTTP) y `auth` (microservicio NATS) + lib `common`; `docker-compose` (postgres + nats); `.env.example` + validación de env por app; `ValidationPipe` global. Verificado: `pnpm build` y `pnpm lint` limpios; ambos servicios arrancan (gateway responde `GET /health`, auth conecta a NATS).
- **2026-07-14 — FEATURE — Fase 2: Capa de dominio (auth).** Entidades `User` (roles `text[]`) y `RefreshToken`; VOs `Email` y `HashedPassword`; errores de dominio; puertos abstractos (`UserRepository`/`RefreshTokenRepository` en `domain/ports`, `PasswordHasher`/`TokenService` en `application/ports`). Regla ESLint `no-restricted-imports` que impide que `domain`/`application` importen NestJS/Knex/HTTP/rxjs.
- **2026-07-14 — FEATURE — Fase 3: Infraestructura Knex.** `knexfile.ts` + migración inicial (`pgcrypto`, `users`, `refresh_tokens`, índices); `KnexService`; repos Knex; `Argon2PasswordHasher`; `JwtTokenService` (access/refresh con secretos y TTL distintos); DI puerto→adaptador con `useClass`.
- **2026-07-14 — FIX — Puerto de Postgres configurable.** El 5432 del host chocaba con el postgres del contenedor; se añadió `POSTGRES_PORT` (compose) y en local se usa 5433. `.env.example` documenta el caso.
- **2026-07-14 — FEATURE — Fase 4: Casos de uso.** `Register`, `Login` (error único + verify dummy anti-enumeración), `RefreshTokens` (rotación `replaced_by` + detección de reúso que revoca todas las sesiones, con claim atómico `UPDATE ... WHERE revoked_at IS NULL`) y `Logout` idempotente. Casos de uso como clases **puras** registradas con `useFactory` + `inject` (composition root en `auth.module`).
- **2026-07-14 — FEATURE — Fase 5: Presentación + gateway.** `@MessagePattern('auth.*')` en auth + filtro dominio→`RpcException({code,message})`; gateway con controladores HTTP, DTOs class-validator, `JwtAuthGuard` (valida access local), `@CurrentUser`, ruta protegida `GET /auth/me` y `RpcToHttpExceptionFilter` (code→status). Verificado e2e manual (19/19).
- **2026-07-14 — FEATURE — Fase 6: Tests y cierre.** 13 tests unitarios de los 4 casos de uso (puertos mockeados, incl. reúso) + e2e del flujo completo con Testcontainers (postgres + nats, ambas apps in-process). `README` añadido. `pnpm lint`, `pnpm test` y `pnpm test:e2e` en verde.
- **2026-07-14 — DEUDA — Precedencia de env en tests.** `ConfigModule.forRoot` valida el entorno **al importar** el módulo; en el e2e los módulos se cargan con `import()` diferido tras fijar `process.env`, y `ConfigModule` usa `ignoreEnvFile` cuando `NODE_ENV==='test'`. Tenerlo presente al añadir nuevos microservicios/tests.
- **2026-07-15 — FEATURE — Registro ampliado.** `users` gana `first_name`, `last_name`, `phone_number` y flags `email_verified_at`/`phone_verified_at`; nueva tabla `addresses` (1:1). VOs `Address` y `PhoneNumber` (E.164). `create` transaccional (user+address). `confirmPassword` se valida en el gateway (`@Match`) y no cruza NATS. El access token ahora lleva `phoneNumber`/`emailVerified`/`phoneVerified`. Actualizadas §5 (tablas) y token.
- **2026-07-15 — DECISIÓN — Verificación event-driven, login permitido sin verificar.** auth emite `user.registered` (auto-envío) y consume `contact.verified` (marca verificado); verification emite `contact.verified`. Publicación por puertos de aplicación + adaptador NATS (`application` no importa `ClientProxy`/rxjs). `emit()` se consume con `firstValueFrom`.
- **2026-07-15 — FEATURE — Microservicio `verification` (OTP).** Nuevo `apps/verification` (NATS) con **BD propia** `cudmy_verification`. OTP de 6 dígitos hasheado (argon2), TTL 10m, máx. 5 intentos, cooldown 60s, un código activo por (user, canal). Entrega por puerto `Notifier` (console/memory/composite; Twilio/SMTP a futuro vía `SMS_PROVIDER`/`EMAIL_PROVIDER`). `Clock` inyectable para tests. Gateway `POST /verification/request|verify` (protegidos). Scripts `db:migrate:auth|verification`. Tests: 35 unit + 5 e2e verdes.
- **2026-07-15 — DEUDA — Entrega OTP y auto-envío SMS.** La entrega es *stub* (log/memoria); falta integrar Twilio (SMS) y Nodemailer/SMTP (correo) — confirmar firmas contra doc oficial al implementar. El registro auto-envía a **ambos** canales; en producción quizá convenga gatear el SMS por costo. NATS core no es durable (eventos at-most-once); si se requiere entrega garantizada, evaluar JetStream.
- _(siguiente entrada aquí)_

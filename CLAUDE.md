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
- **Access token**: JWT firmado con `ACCESS_TOKEN_SECRET`, TTL corto (**15m**). Payload: `{ sub, email, roles }`. Se **valida en el gateway** con el secreto compartido → sin ida y vuelta al microservicio.
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
| `created_at` | timestamptz | `default now()` |
| `updated_at` | timestamptz | |

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

# Migraciones (microservicio auth, Knex)
pnpm db:migrate          # knex migrate:latest
pnpm db:rollback         # knex migrate:rollback
pnpm db:make <nombre>    # knex migrate:make -x ts

# Desarrollo
pnpm start:dev gateway
pnpm start:dev auth

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
- _(siguiente entrada aquí)_

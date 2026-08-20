# Backlog — BFF Ñeque

Descomposición del trabajo en **épicas → historias → tickets**. La regla operativa es
**1 ticket = 1 rama = 1 PR**, salvo los tickets sin cambio de lógica (documentación,
plantillas, configuración del repo), que se trabajan directo sobre `develop`
(ver [`CONTRIBUTING.md`](../CONTRIBUTING.md)).

Este repositorio es el **BFF NestJS con arquitectura hexagonal** de la app móvil Ñeque
(entrenadores personales). Es lo único con lo que habla la app: agrega Supabase — y lo que
venga después — detrás de un solo contrato HTTP, de modo que ninguna credencial
privilegiada viaje en el binario de la app, de donde sería extraíble.

```
App Ñeque (Angular 17 + Ionic + Capacitor)
        │  HTTP + JWT propio
        ▼
   BFF NestJS  ──service_role──> Supabase (Postgres + Auth)
               └──────────────> Flow.cl u otras APIs (a futuro)
```

> **El orden de este backlog no es por capas técnicas, es por lo que desbloquea en la
> app.** El repo de la app tiene hoy 5 tickets marcados 🔗 esperando endpoints de acá.

---

## Decisiones tomadas (2026-08-19)

Resueltas antes de escribir código, en la sesión que abrió este repositorio.

| #   | Decisión                         | Qué se eligió                                                                                                                                        | Por qué                                                                                                                                                                                                                                                                                                                   |
| --- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Modelo de auth**               | El BFF **emite su propio JWT**. Valida la contraseña contra Supabase server-side, descarta los tokens de Supabase y firma los suyos.                 | Supabase queda como detalle de persistencia detrás de un puerto (`AUTH_PROVIDER_PORT`). El contrato con la app no se ata al proveedor y el BFF controla claims, expiración y rotación. Costo aceptado: tabla `refresh_tokens` propia.                                                                                     |
| 2   | **Alta de entrenadores**         | **Consola de Supabase**, documentada. La app es invitation-only y no tiene registro.                                                                 | Cero código y cero superficie expuesta. Un endpoint admin se puede sumar después sin romper nada.                                                                                                                                                                                                                         |
| 3   | **Deploy**                       | **Render** (free tier). Dev: `http://localhost:3000`.                                                                                                | Web service Node directo, env vars en panel, URL estable para el build de producción de la app.                                                                                                                                                                                                                           |
| 4   | **Rutina ↔ cliente**             | **N:M** vía tabla `routine_assignments`.                                                                                                             | Es lo que implica `POST /routines/:id/assign` con `{ clientId }`: la rutina es una plantilla del entrenador, asignable a varios clientes. Habilita historial de asignaciones.                                                                                                                                             |
| 5   | **Canal del OTP**                | **Supabase envía el email, el BFF verifica el código server-side** y recién ahí firma su JWT.                                                        | El OTP de email de Supabase ya es de 6 dígitos numéricos, que es como está construida la UI. Cero infraestructura de correo y cero tabla de OTP. **Limitación conocida:** el SMTP gratuito de Supabase limita a ~2-4 emails/hora — suficiente para demo, insuficiente para producción; el salto a SMTP propio es T-7.1.4. |
| 6   | **Semántica de la recuperación** | `POST /auth/password/verify` **loguea** (devuelve sesión), no cambia la contraseña. El cambio de clave vive en `PATCH /me/password`, ya autenticado. | Es lo que la `ForgotPasswordPage` de la app hace hoy: no tiene pantalla de contraseña nueva. Respeta el contrato ya diseñado en vez de forzar un rediseño de la UI.                                                                                                                                                       |
| 7   | **Prefijo de ticket**            | `NEQUEBFF-<épica>.<historia>.<ticket>`                                                                                                               | No colisiona con el `NEQUE-x.y.z` del repo de la app.                                                                                                                                                                                                                                                                     |
| 8   | **Estructura de código**         | **Vertical slicing + hexagonal**: `src/modules/<feature>/{domain,application,infrastructure}`.                                                       | Cada feature es una rebanada autocontenida con su propio hexágono. No existe un `domain/` global compartido entre features.                                                                                                                                                                                               |

### Desviación deliberada del skill `hexagonal-service`

El skill corporativo exige que _"el BFF nunca retorne 401 ni 403"_. **Acá no aplica**: el
contrato que la app ya asume usa `401` tanto para credenciales inválidas como para token
expirado, y el interceptor de la app dispara un `refresh()` justo ante ese `401`. Devolver
`500` rompería el flujo de sesión. Del skill se toman el layout de capas, el naming y el
checklist de calidad; la tabla de códigos HTTP se reemplaza por la de este documento.

---

## Contrato HTTP

La fuente de verdad del contrato ya acordado es la sección _"Contrato HTTP que asume la
app"_ de la Épica 1 en `docs/BACKLOG.md` del repo `ui-any-neque-mobile-app`. **Se lee desde
ahí** para que no se desincronicen.

| Método        | Endpoint                | Body                               | Respuesta                                | Épica |
| ------------- | ----------------------- | ---------------------------------- | ---------------------------------------- | ----- |
| `GET`         | `/health`               | —                                  | `{ status, uptimeSeconds, version }`     | 0 ✅  |
| `POST`        | `/auth/login`           | `{ email, password }`              | `{ accessToken, refreshToken, trainer }` | 2     |
| `POST`        | `/auth/password/forgot` | `{ email }`                        | `204`                                    | 2     |
| `POST`        | `/auth/password/verify` | `{ email, code }`                  | `{ accessToken, refreshToken, trainer }` | 2     |
| `POST`        | `/auth/refresh`         | `{ refreshToken }`                 | `{ accessToken, refreshToken }`          | 2     |
| `POST`        | `/auth/logout`          | —                                  | `204`                                    | 2     |
| `GET`         | `/me`                   | —                                  | perfil del entrenador                    | 3     |
| `PATCH`       | `/me/password` ⚠️       | `{ currentPassword, newPassword }` | `204`                                    | 3     |
| `GET` `POST`  | `/clients`              | — / alta                           | lista / cliente creado                   | 4     |
| `GET` `PATCH` | `/clients/:id`          | — / parcial                        | cliente                                  | 4     |
| `GET` `POST`  | `/routines`             | — / alta                           | lista / rutina creada                    | 5     |
| `PATCH`       | `/routines/:id`         | parcial                            | rutina                                   | 5     |
| `POST`        | `/routines/:id/assign`  | `{ clientId }`                     | asignación                               | 5     |
| `GET`         | `/metrics/summary` ⚠️   | —                                  | `{ clientsCount, routinesCount }`        | 6     |

⚠️ **Endpoints que el backlog de la app todavía no contempla.** `PATCH /me/password` sale
de la decisión #6 y `GET /metrics/summary` de que el dashboard necesita conteos que hoy la
app resolvería pidiendo las dos listas completas. Ambos requieren actualizar el backlog de
la app cuando se implementen (ver el checkbox de contrato en el template de PR).

### Reglas transversales, obligatorias en todo endpoint

1. **El `trainerId` sale del claim `sub` del JWT, nunca del request.** La app no lo manda
   en ningún endpoint. Un BFF que confiara en un `trainerId` del body dejaría que
   cualquiera leyera los datos de otro entrenador.
2. **Errores uniformes `{ statusCode, message }`** — resuelto globalmente por
   `HttpExceptionFilter`. El detalle interno de un 5xx nunca se filtra al cliente.
3. **`401` en credenciales inválidas y en token expirado.** La app hace un intento de
   `refresh` ante el `401`.
4. **`404`, no `403`, ante un recurso de otro entrenador** — no se revela que existe.
5. **CORS** habilitado para `capacitor://localhost`, `http://localhost` y
   `http://localhost:4200`.
6. Payload en **camelCase y en inglés**; recursos en plural y sin verbos en la URL.

---

## Dependencias: qué desbloquea qué

| Épica del BFF    | Entrega                                | Desbloquea en la app                             |
| ---------------- | -------------------------------------- | ------------------------------------------------ |
| 0 — Fundación    | Scaffold, CI, gitflow, `/health`       | —                                                |
| 1 — Persistencia | Supabase conectado, esquema creado     | — (prerrequisito de la 2)                        |
| **2 — Auth**     | Los 5 endpoints de `/auth`             | **T-1.1.3, T-1.1.4, T-1.2.1, T-1.3.1** (Épica 1) |
| 3 — Perfil       | `GET /me`                              | T-4.1.1, T-4.1.2 (Épica 4)                       |
| 4 — Clientes     | CRUD de `/clients`                     | T-2.1.2 y con él toda la Épica 2                 |
| 5 — Rutinas      | CRUD de `/routines` + assign           | T-3.1.2 y con él toda la Épica 3                 |
| 6 — Métricas     | Conteos del dashboard                  | T-5.1.1 (Épica 5)                                |
| 7 — Deploy       | BFF desplegado y `apiBaseUrl` acordado | Épica 6 (release)                                |

**Camino crítico: la Épica 2.** Sin `POST /auth/login` la app no pasa de la pantalla de
inicio y las Épicas 2–5 de la app quedan todas detrás. Mientras tanto, en la app solo
avanzan T-1.1.1 (`provideHttpClient` + `apiBaseUrl`), T-1.1.2 (`TokenStorage`) y T-1.2.2
(el guard).

---

## ÉPICA 0 — Fundación, CI y gitflow

> Deja el repositorio con la misma paridad de tooling que `ui-any-neque-mobile-app`,
> el pipeline verde con cobertura real y el gitflow protegido.
>
> **Definición de terminado:** `main` y `develop` publicadas y protegidas con required
> check `ci-gate`, la secuencia `lint → format:check → typecheck → test:coverage → build`
> en verde, y `GET /health` respondiendo.

### HU-0.1 — Infraestructura de gitflow

| Ticket  | Rama                      | Qué hace                                                                                                                                                      |
| ------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-0.1.1 | _(sin PR)_                | Commit inicial, publicar `main` y crear `develop` desde ella. Hoy el repo remoto tiene **0 commits y ninguna rama por defecto**.                              |
| T-0.1.2 | _(sin PR)_                | Branch protection en `main` y `develop`: required check `ci-gate`, PR obligatorio con **0 aprobaciones**, sin force-push ni borrado, `enforce_admins: false`. |
| T-0.1.3 | `develop` (directo)       | `.github/`: `pull_request_template.md`, `ISSUE_TEMPLATE/` (bug, feature, task), `CODEOWNERS` con `* @cosyfps`.                                                |
| T-0.1.4 | `develop` (directo)       | `CONTRIBUTING.md`.                                                                                                                                            |
| T-0.1.5 | `develop` (directo)       | Este documento.                                                                                                                                               |
| T-0.1.6 | `develop` (directo)       | `README.md` y `.env.example`.                                                                                                                                 |
| T-0.1.7 | **PR `develop` → `main`** | Bootstrap del gitflow: valida que `ci-gate` corre y bloquea.                                                                                                  |

**Nota sobre T-0.1.2 — por qué 0 aprobaciones.** GitHub no permite aprobar tu propio PR;
en un repo de una sola persona exigir 1 aprobación bloquearía todos los merges. Se exige PR

- `ci-gate` en verde, que es lo que realmente protege. `enforce_admins: false` deja al
  owner commitear directo sobre `develop` los tickets sin cambio de lógica.

### HU-0.2 — Scaffold NestJS y pipeline

| Ticket  | Rama                                 | Qué hace                                                                                                                                                                                                                                   |
| ------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T-0.2.1 | `chore/NEQUEBFF-0.2.1-nest-scaffold` | NestJS 11 + TypeScript estricto, ESLint (`--max-warnings 0`) + Prettier, commitlint + husky + lint-staged, Jest con umbral de **80% en las 4 métricas**. Paridad de configuración con el repo de la app.                                   |
| T-0.2.2 | `ci/NEQUEBFF-0.2.2-ci-pipeline`      | `ci.yml`: `dependencies → lint + typecheck → test → build → ci-gate`. El step de cobertura compara **métrica por métrica** y exige valores numéricos — se copia el step ya corregido de la app, no el que promediaba y dejaba pasar `NaN`. |
| T-0.2.3 | `feat/NEQUEBFF-0.2.3-http-baseline`  | `HttpExceptionFilter` con `{ statusCode, message }`, `ValidationPipe` global (`whitelist` + `forbidNonWhitelisted`), CORS de los tres orígenes, Swagger en `/docs`.                                                                        |
| T-0.2.4 | `feat/NEQUEBFF-0.2.4-healthcheck`    | `GET /health` como primera rebanada vertical completa (`domain` / `application` / `infrastructure`) — sirve de patrón de referencia para todas las features siguientes.                                                                    |

**Criterios de aceptación:** `npm run lint; npm run format:check; npm run typecheck; npm run test:coverage; npm run build`
pasa limpio, y el gate de cobertura reporta números reales, no `Unknown`.

---

## ÉPICA 1 — Persistencia: Supabase y esquema de datos

> Prerrequisito técnico de la Épica 2. No entrega nada visible a la app, pero sin esto no
> hay dónde autenticar ni qué consultar.
>
> **Definición de terminado:** el BFF arranca contra Supabase o falla ruidosamente si le
> falta configuración; las 5 tablas existen con sus migraciones versionadas en el repo.

### HU-1.1 — Conexión a Supabase

| Ticket  | Rama                                           | Qué hace                                                                                                                                                                                                        |
| ------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-1.1.1 | `feat/NEQUEBFF-1.1.1-supabase-config`          | `supabase.config.ts` + validación de env al arrancar: si falta `SUPABASE_URL` o `SUPABASE_SERVICE_ROLE_KEY`, el proceso no levanta. Fallar en el arranque, no en el primer request.                             |
| T-1.1.2 | `feat/NEQUEBFF-1.1.2-supabase-client-provider` | Módulo compartido que provee el `SupabaseClient` con `service_role` bajo el token `SUPABASE_CLIENT`. La `service_role` key nunca sale del BFF.                                                                  |
| T-1.1.3 | `feat/NEQUEBFF-1.1.3-health-supabase-check`    | `GET /health` verifica Supabase a través de un puerto `HEALTH_CHECK_PORT` + adapter; responde `degraded` si el proveedor no contesta. Es la pieza que faltaba para que la rebanada de health tenga puerto real. |

### HU-1.2 — Esquema de datos

| Ticket  | Rama                                        | Qué hace                                                                                                                                                                          |
| ------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-1.2.1 | `feat/NEQUEBFF-1.2.1-schema-trainers`       | Migración `trainers`: `id` (= `auth.users.id`), `email`, `full_name`, `created_at`.                                                                                               |
| T-1.2.2 | `feat/NEQUEBFF-1.2.2-schema-clients`        | Migración `clients` con `trainer_id` FK + índice. Todo query filtra por ahí.                                                                                                      |
| T-1.2.3 | `feat/NEQUEBFF-1.2.3-schema-routines`       | Migración `routines` (`trainer_id`) y `routine_assignments` (`routine_id`, `client_id`, unique compuesto) — la relación **N:M** de la decisión #4.                                |
| T-1.2.4 | `feat/NEQUEBFF-1.2.4-schema-refresh-tokens` | Migración `refresh_tokens`: `token_hash`, `trainer_id`, `expires_at`, `revoked_at`, `replaced_by`. Base de la rotación con detección de reuso. Nunca se guarda el token en claro. |
| T-1.2.5 | `develop` (directo)                         | Documentar en el README el alta de entrenadores por consola de Supabase (decisión #2): crear el usuario en Auth y su fila en `trainers`.                                          |

---

## ÉPICA 2 — Autenticación — **CAMINO CRÍTICO**

> Los 5 endpoints de `/auth`. Desbloquea los 4 tickets 🔗 de la Épica 1 de la app y, con
> ellos, todo el roadmap de producto.
>
> **Definición de terminado:** la app puede loguear, mantener sesión entre arranques,
> refrescar el token vencido, cerrar sesión y recuperar el acceso por OTP, sin que ningún
> endpoint acepte un `trainerId` del request.

### HU-2.1 — Emisión y validación de tokens propios

| Ticket  | Rama                                      | Qué hace                                                                                                                                                                  |
| ------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-2.1.1 | `feat/NEQUEBFF-2.1.1-token-service`       | `jwt.config.ts` + `TokenService`: firma el access token (15 min, claim `sub` = `trainerId`) y genera el refresh token (30 días). **+ spec.**                              |
| T-2.1.2 | `feat/NEQUEBFF-2.1.2-refresh-token-store` | Puerto `REFRESH_TOKEN_PORT` + adapter Supabase: persistir hash, rotar en cada uso, revocar y **detectar reuso** (un refresh ya rotado revoca toda la cadena). **+ spec.** |
| T-2.1.3 | `feat/NEQUEBFF-2.1.3-jwt-auth-guard`      | `JwtAuthGuard` global + decoradores `@Public()` y `@CurrentTrainer()`. Por defecto **todo endpoint está protegido**; abrirlo es explícito. **+ spec.**                    |

### HU-2.2 — Login

| Ticket  | Rama                                     | Qué hace                                                                                                                                                                                                                                   |
| ------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T-2.2.1 | `feat/NEQUEBFF-2.2.1-auth-provider-port` | Puerto `AUTH_PROVIDER_PORT` + `SupabaseAuthAdapter` como anti-corruption layer: `signInWithPassword` server-side, traduce a la entidad de dominio `Trainer` y **descarta los tokens de Supabase**. **+ spec de todos los casos de error.** |
| T-2.2.2 | `feat/NEQUEBFF-2.2.2-login-endpoint`     | `POST /auth/login` → `{ accessToken, refreshToken, trainer }`. `401` en credenciales inválidas, con el mismo mensaje para email inexistente y password errado. **+ spec.**                                                                 |

### HU-2.3 — Ciclo de vida de la sesión

| Ticket  | Rama                                   | Qué hace                                                                                                    |
| ------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| T-2.3.1 | `feat/NEQUEBFF-2.3.1-refresh-endpoint` | `POST /auth/refresh` → par nuevo con rotación. `401` si está expirado, revocado o ya fue usado. **+ spec.** |
| T-2.3.2 | `feat/NEQUEBFF-2.3.2-logout-endpoint`  | `POST /auth/logout` → `204`, revoca el refresh token vigente. Idempotente. **+ spec.**                      |

### HU-2.4 — Recuperación de contraseña

| Ticket  | Rama                                  | Qué hace                                                                                                                                                                             |
| ------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T-2.4.1 | `feat/NEQUEBFF-2.4.1-forgot-endpoint` | `POST /auth/password/forgot` → dispara el OTP de 6 dígitos vía Supabase y responde **`204` siempre**, exista o no el email — no se filtra qué cuentas están registradas. **+ spec.** |
| T-2.4.2 | `feat/NEQUEBFF-2.4.2-verify-endpoint` | `POST /auth/password/verify` → `verifyOtp` server-side y, si es válido, emite el JWT propio (decisión #6: verificar **loguea**). `401` con código inválido o vencido. **+ spec.**    |

**Orden:** HU-2.1 completa primero — el resto depende de poder firmar y validar tokens.

---

## ÉPICA 3 — Perfil del entrenador

> Desbloquea la Épica 4 de la app (`/trainer/profile` deja de ser un alias del dashboard).
>
> **Definición de terminado:** la app puede mostrar el perfil del entrenador autenticado y
> cerrar sesión; el cambio de contraseña queda cubierto.

| Ticket  | Rama                                  | Qué hace                                                                                                                                                                                                                         |
| ------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-3.1.1 | `feat/NEQUEBFF-3.1.1-me-endpoint`     | `GET /me` con el trainer del claim `sub`. **+ spec.**                                                                                                                                                                            |
| T-3.1.2 | `feat/NEQUEBFF-3.1.2-change-password` | `PATCH /me/password` con `{ currentPassword, newPassword }` → `204`. Cierra el flujo de recuperación de la decisión #6 y revoca los refresh tokens vigentes. ⚠️ **Contrato nuevo: actualizar el backlog de la app.** **+ spec.** |

---

## ÉPICA 4 — Clientes

> Desbloquea T-2.1.2 de la app y con él toda su Épica 2.
>
> **Definición de terminado:** CRUD completo de clientes del entrenador autenticado, con
> aislamiento verificado por test: un entrenador no ve ni toca clientes de otro.

### HU-4.1 — Dominio y persistencia

| Ticket  | Rama                                          | Qué hace                                                                                                                                           |
| ------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-4.1.1 | `feat/NEQUEBFF-4.1.1-client-domain-port`      | Entidad `Client` + puerto `CLIENT_REPOSITORY_PORT`. Sin decoradores ni tipos de infraestructura en `domain/`.                                      |
| T-4.1.2 | `feat/NEQUEBFF-4.1.2-client-supabase-adapter` | Adapter Supabase del puerto, con `trainerId` obligatorio en toda operación. **+ spec, incluyendo el caso "el id existe pero es de otro trainer".** |

### HU-4.2 — Endpoints

| Ticket  | Rama                                        | Qué hace                                                                                                         |
| ------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| T-4.2.1 | `feat/NEQUEBFF-4.2.1-clients-list-create`   | `GET /clients` y `POST /clients`. **+ spec.**                                                                    |
| T-4.2.2 | `feat/NEQUEBFF-4.2.2-clients-detail-update` | `GET /clients/:id` y `PATCH /clients/:id`. **`404`, no `403`**, si el cliente es de otro entrenador. **+ spec.** |

---

## ÉPICA 5 — Rutinas

> Desbloquea T-3.1.2 de la app y con él toda su Épica 3. Depende de la Épica 4: asignar
> requiere clientes.
>
> **Definición de terminado:** CRUD de rutinas y asignación a clientes, con la relación
> N:M de la decisión #4.

### HU-5.1 — Dominio y persistencia

| Ticket  | Rama                                           | Qué hace                                                                           |
| ------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| T-5.1.1 | `feat/NEQUEBFF-5.1.1-routine-domain-port`      | Entidad `Routine`, entidad `RoutineAssignment` y puerto `ROUTINE_REPOSITORY_PORT`. |
| T-5.1.2 | `feat/NEQUEBFF-5.1.2-routine-supabase-adapter` | Adapter Supabase sobre `routines` + `routine_assignments`. **+ spec.**             |

### HU-5.2 — Endpoints de rutina

| Ticket  | Rama                                       | Qué hace                                        |
| ------- | ------------------------------------------ | ----------------------------------------------- |
| T-5.2.1 | `feat/NEQUEBFF-5.2.1-routines-list-create` | `GET /routines` y `POST /routines`. **+ spec.** |
| T-5.2.2 | `feat/NEQUEBFF-5.2.2-routines-update`      | `PATCH /routines/:id`. **+ spec.**              |

### HU-5.3 — Asignación

| Ticket  | Rama                                 | Qué hace                                                                                                                                                           |
| ------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T-5.3.1 | `feat/NEQUEBFF-5.3.1-assign-routine` | `POST /routines/:id/assign` con `{ clientId }`. Valida que **rutina y cliente pertenezcan al mismo entrenador** y que la asignación no esté duplicada. **+ spec.** |

---

## ÉPICA 6 — Métricas del dashboard

> Desbloquea T-5.1.1 de la app (las dos métricas hoy hardcodeadas en `"—"`).
>
> **Definición de terminado:** un solo request devuelve los conteos que el dashboard
> necesita, sin que la app tenga que pedir las dos listas completas para contarlas.

| Ticket  | Rama                                  | Qué hace                                                                                                                                                                                                        |
| ------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-6.1.1 | `feat/NEQUEBFF-6.1.1-metrics-summary` | `GET /metrics/summary` → `{ clientsCount, routinesCount }` del entrenador autenticado, resuelto con `count` en Postgres, no trayendo filas. ⚠️ **Contrato nuevo: actualizar el backlog de la app.** **+ spec.** |

---

## ÉPICA 7 — Deploy y release v1.0.0

> **Definición de terminado:** el BFF corre en Render con una URL estable, la app apunta a
> ella en su build de producción, y el tag `v1.0.0` queda cortado.

### HU-7.1 — Despliegue

| Ticket  | Rama                                  | Qué hace                                                                                                                                                                                    |
| ------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-7.1.1 | `chore/NEQUEBFF-7.1.1-render-service` | Servicio en Render (decisión #3): build `npm ci && npm run build`, start `npm run start:prod`, health check path `/health`.                                                                 |
| T-7.1.2 | `chore/NEQUEBFF-7.1.2-production-env` | Env vars de producción cargadas en Render: `SUPABASE_*`, `JWT_SECRET`, `CORS_ORIGINS`. Ningún secreto en el repo.                                                                           |
| T-7.1.3 | `develop` (directo)                   | Acordar y documentar el `apiBaseUrl` por entorno con el repo de la app (dev `http://localhost:3000`, prod la URL de Render). Cierra la dependencia de T-1.1.1 de la app.                    |
| T-7.1.4 | `chore/NEQUEBFF-7.1.4-custom-smtp`    | SMTP propio en Supabase Auth para levantar el límite de ~2-4 emails/hora del SMTP compartido (limitación registrada en la decisión #5). Bloqueante para uso real del flujo de recuperación. |

### HU-7.2 — QA de integración

| Ticket  | Rama                                           | Qué hace                                                                                                                                                                      |
| ------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-7.2.1 | `test/NEQUEBFF-7.2.1-integration-qa-checklist` | Recorrido end-to-end app ↔ BFF: login → dashboard → clientes → rutinas → perfil → logout, más token expirado, refresh y aislamiento entre entrenadores. Checklist en `docs/`. |

### HU-7.3 — Corte de release

| Ticket  | Rama                                          | Qué hace                                                                                       |
| ------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| T-7.3.1 | `chore/NEQUEBFF-7.3.1-version-bump-changelog` | Bump de versión en `package.json` + `CHANGELOG.md`. PR a `develop`.                            |
| T-7.3.2 | `release/1.0.0`                               | Rama de release desde `develop` → PR a `main`, tag `v1.0.0`, back-merge de `main` a `develop`. |

---

## Resumen

| Épica                       | Historias | Tickets | Desbloquea en la app        |
| --------------------------- | --------- | ------- | --------------------------- |
| 0 — Fundación, CI y gitflow | 2         | 11      | —                           |
| 1 — Persistencia (Supabase) | 2         | 8       | —                           |
| **2 — Autenticación**       | 4         | 9       | **4 tickets de la Épica 1** |
| 3 — Perfil                  | 1         | 2       | Épica 4 completa            |
| 4 — Clientes                | 2         | 4       | Épica 2 completa            |
| 5 — Rutinas                 | 3         | 5       | Épica 3 completa            |
| 6 — Métricas                | 1         | 1       | Épica 5 completa            |
| 7 — Deploy y release        | 3         | 7       | Épica 6                     |
| **Total**                   | **18**    | **47**  |                             |

### Orden de ejecución

- **Épica 0**: bloquea a todas. Secuencial 0.1 → 0.2 salvo que T-0.2.x ya está construido
  en el bootstrap: lo que resta es publicarlo y proteger las ramas.
- **Épica 1**: prerrequisito duro de la 2. Dentro, HU-1.1 antes que HU-1.2.
- **Épica 2**: el camino crítico. HU-2.1 antes que todo lo demás; HU-2.2, 2.3 y 2.4
  pueden avanzar en paralelo una vez que hay `TokenService` y guard.
- **Épica 3**: depende solo de la 2.
- **Épicas 4 y 5**: dependen de la 2 (hace falta saber qué entrenador está autenticado).
  La 5 depende además de la 4 para el ticket de asignación.
- **Épica 6**: depende de la 4 y la 5.
- **Épica 7**: al final, aunque T-7.1.1 y T-7.1.2 pueden adelantarse apenas cierre la
  Épica 2 para que la app pueda integrar contra un ambiente real.

---

## Tablero de ejecución

Lista plana en orden de trabajo. Estados: ✅ mergeado · 🔄 en curso · ⬜ pendiente.

### Épica 0 — Fundación, CI y gitflow

| #   | Ticket  | Rama                                             | Estado             |
| --- | ------- | ------------------------------------------------ | ------------------ |
| 01  | T-0.1.1 | _(sin PR)_ commit inicial + `main` y `develop`   | ⬜                 |
| 02  | T-0.1.2 | _(sin PR)_ branch protection                     | ⬜                 |
| 03  | T-0.1.3 | `develop` (directo) plantillas GitHub            | 🔄 en el bootstrap |
| 04  | T-0.1.4 | `develop` (directo) `CONTRIBUTING.md`            | 🔄 en el bootstrap |
| 05  | T-0.1.5 | `develop` (directo) `docs/BACKLOG.md`            | 🔄 en el bootstrap |
| 06  | T-0.1.6 | `develop` (directo) `README.md` + `.env.example` | 🔄 en el bootstrap |
| 07  | T-0.1.7 | PR `develop` → `main`                            | ⬜                 |
| 08  | T-0.2.1 | `chore/NEQUEBFF-0.2.1-nest-scaffold`             | 🔄 en el bootstrap |
| 09  | T-0.2.2 | `ci/NEQUEBFF-0.2.2-ci-pipeline`                  | 🔄 en el bootstrap |
| 10  | T-0.2.3 | `feat/NEQUEBFF-0.2.3-http-baseline`              | 🔄 en el bootstrap |
| 11  | T-0.2.4 | `feat/NEQUEBFF-0.2.4-healthcheck`                | 🔄 en el bootstrap |

> Los tickets marcados 🔄 están **escritos y validados en local** (`lint`,
> `format:check`, `typecheck`, `test:coverage` con 100% en las 4 métricas, y `build`),
> pero el repositorio todavía no tiene ningún commit. Pasan a ✅ cuando T-0.1.1 los
> publique.

### Épica 1 — Persistencia

| #   | Ticket  | Rama                                           | Estado |
| --- | ------- | ---------------------------------------------- | ------ |
| 12  | T-1.1.1 | `feat/NEQUEBFF-1.1.1-supabase-config`          | ⬜     |
| 13  | T-1.1.2 | `feat/NEQUEBFF-1.1.2-supabase-client-provider` | ⬜     |
| 14  | T-1.1.3 | `feat/NEQUEBFF-1.1.3-health-supabase-check`    | ⬜     |
| 15  | T-1.2.1 | `feat/NEQUEBFF-1.2.1-schema-trainers`          | ⬜     |
| 16  | T-1.2.2 | `feat/NEQUEBFF-1.2.2-schema-clients`           | ⬜     |
| 17  | T-1.2.3 | `feat/NEQUEBFF-1.2.3-schema-routines`          | ⬜     |
| 18  | T-1.2.4 | `feat/NEQUEBFF-1.2.4-schema-refresh-tokens`    | ⬜     |
| 19  | T-1.2.5 | `develop` (directo) alta de entrenadores       | ⬜     |

### Épica 2 — Autenticación (camino crítico)

| #   | Ticket  | Rama                                      | Estado                  |
| --- | ------- | ----------------------------------------- | ----------------------- |
| 20  | T-2.1.1 | `feat/NEQUEBFF-2.1.1-token-service`       | ⬜                      |
| 21  | T-2.1.2 | `feat/NEQUEBFF-2.1.2-refresh-token-store` | ⬜                      |
| 22  | T-2.1.3 | `feat/NEQUEBFF-2.1.3-jwt-auth-guard`      | ⬜                      |
| 23  | T-2.2.1 | `feat/NEQUEBFF-2.2.1-auth-provider-port`  | ⬜                      |
| 24  | T-2.2.2 | `feat/NEQUEBFF-2.2.2-login-endpoint`      | ⬜ 🔓 T-1.1.3 de la app |
| 25  | T-2.3.1 | `feat/NEQUEBFF-2.3.1-refresh-endpoint`    | ⬜ 🔓 T-1.1.4 de la app |
| 26  | T-2.3.2 | `feat/NEQUEBFF-2.3.2-logout-endpoint`     | ⬜                      |
| 27  | T-2.4.1 | `feat/NEQUEBFF-2.4.1-forgot-endpoint`     | ⬜ 🔓 T-1.3.1 de la app |
| 28  | T-2.4.2 | `feat/NEQUEBFF-2.4.2-verify-endpoint`     | ⬜ 🔓 T-1.3.1 de la app |

### Épica 3 — Perfil

| #   | Ticket  | Rama                                  | Estado                  |
| --- | ------- | ------------------------------------- | ----------------------- |
| 29  | T-3.1.1 | `feat/NEQUEBFF-3.1.1-me-endpoint`     | ⬜ 🔓 T-4.1.1 de la app |
| 30  | T-3.1.2 | `feat/NEQUEBFF-3.1.2-change-password` | ⬜                      |

### Épica 4 — Clientes

| #   | Ticket  | Rama                                          | Estado                  |
| --- | ------- | --------------------------------------------- | ----------------------- |
| 31  | T-4.1.1 | `feat/NEQUEBFF-4.1.1-client-domain-port`      | ⬜                      |
| 32  | T-4.1.2 | `feat/NEQUEBFF-4.1.2-client-supabase-adapter` | ⬜                      |
| 33  | T-4.2.1 | `feat/NEQUEBFF-4.2.1-clients-list-create`     | ⬜ 🔓 T-2.1.2 de la app |
| 34  | T-4.2.2 | `feat/NEQUEBFF-4.2.2-clients-detail-update`   | ⬜                      |

### Épica 5 — Rutinas

| #   | Ticket  | Rama                                           | Estado                  |
| --- | ------- | ---------------------------------------------- | ----------------------- |
| 35  | T-5.1.1 | `feat/NEQUEBFF-5.1.1-routine-domain-port`      | ⬜                      |
| 36  | T-5.1.2 | `feat/NEQUEBFF-5.1.2-routine-supabase-adapter` | ⬜                      |
| 37  | T-5.2.1 | `feat/NEQUEBFF-5.2.1-routines-list-create`     | ⬜ 🔓 T-3.1.2 de la app |
| 38  | T-5.2.2 | `feat/NEQUEBFF-5.2.2-routines-update`          | ⬜                      |
| 39  | T-5.3.1 | `feat/NEQUEBFF-5.3.1-assign-routine`           | ⬜                      |

### Épica 6 — Métricas

| #   | Ticket  | Rama                                  | Estado                  |
| --- | ------- | ------------------------------------- | ----------------------- |
| 40  | T-6.1.1 | `feat/NEQUEBFF-6.1.1-metrics-summary` | ⬜ 🔓 T-5.1.1 de la app |

### Épica 7 — Deploy y release

| #   | Ticket  | Rama                                           | Estado |
| --- | ------- | ---------------------------------------------- | ------ |
| 41  | T-7.1.1 | `chore/NEQUEBFF-7.1.1-render-service`          | ⬜     |
| 42  | T-7.1.2 | `chore/NEQUEBFF-7.1.2-production-env`          | ⬜     |
| 43  | T-7.1.3 | `develop` (directo) `apiBaseUrl` por entorno   | ⬜     |
| 44  | T-7.1.4 | `chore/NEQUEBFF-7.1.4-custom-smtp`             | ⬜     |
| 45  | T-7.2.1 | `test/NEQUEBFF-7.2.1-integration-qa-checklist` | ⬜     |
| 46  | T-7.3.1 | `chore/NEQUEBFF-7.3.1-version-bump-changelog`  | ⬜     |
| 47  | T-7.3.2 | `release/1.0.0` → `main` + tag `v1.0.0`        | ⬜     |

🔓 = al mergear ese ticket se desbloquea el ticket indicado en `ui-any-neque-mobile-app`.

---

## Fuera de alcance por ahora

- **Endpoint administrativo de alta de entrenadores** — decisión #2: se hace por consola
  de Supabase. Si más adelante hace falta, entra como épica propia con su propia
  autenticación de administrador.
- **Pagos vía Flow.cl** — el BFF es el lugar correcto para integrarlos cuando existan, pero
  hoy no hay ninguna feature de pagos definida en el producto.
- **Auth social y recuperación por SMS** — el alcance es email + contraseña + OTP por
  email.
- **Rate limiting y protección de fuerza bruta** en `/auth/login` — recomendable antes de
  cualquier uso real; sin ticket todavía porque el alcance actual es académico.
- **Observabilidad** (tracing, métricas de infraestructura, alertas).
- **Multi-tenant o roles distintos de "entrenador"** — el modelo asume un único rol.

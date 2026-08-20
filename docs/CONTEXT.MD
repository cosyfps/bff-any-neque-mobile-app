# Kickoff — BFF de Ñeque

Contexto para arrancar el repo `bff-any-neque-mobile-app` en paralelo con la app.
Pégalo (o dale la ruta de este archivo) a la sesión nueva.

---

## Estado de partida

| Dato           | Valor                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Repo BFF       | `https://github.com/cosyfps/bff-any-neque-mobile-app` — público, **vacío** (0 commits, sin rama por defecto)               |
| Clon local     | No existe todavía                                                                                                          |
| Ruta sugerida  | `C:\Users\Kelvin A. Moreno\OneDrive\Documentos\Work\Projects\DuocUC\bff-any-neque-mobile-app` (hermano del repo de la app) |
| Repo de la app | `ui-any-neque-mobile-app`, rama `develop`, Épica 0 cerrada salvo el PR de bootstrap                                        |

## Qué es este BFF

Backend for Frontend en **NestJS con arquitectura hexagonal** (ports & adapters) para la
app móvil Ñeque (entrenadores personales). Es la **única** cosa con la que habla la app:

```
App Ñeque (Angular 17 + Ionic + Capacitor)
        │  HTTP + JWT
        ▼
   BFF NestJS  ──service_role──> Supabase (Postgres + Auth)
               └──────────────> Flow.cl u otras APIs (a futuro)
```

Razón de existir, decidida explícitamente: lógica de negocio propia y agregar varias APIs
detrás de un contrato único, sin que credenciales privilegiadas viajen en el binario de la
app (de donde serían extraíbles).

## Contrato que la app ya asume

Está documentado en `docs/BACKLOG.md` del repo de la app, sección "Contrato HTTP que
asume la app" de la Épica 1. **Léelo desde ahí** en vez de copiarlo, para que no se
desincronicen.

Resumen:

| Método     | Endpoint                                                       | Body                     | Respuesta                                |
| ---------- | -------------------------------------------------------------- | ------------------------ | ---------------------------------------- |
| `POST`     | `/auth/login`                                                  | `{ email, password }`    | `{ accessToken, refreshToken, trainer }` |
| `POST`     | `/auth/password/forgot`                                        | `{ email }`              | `204`                                    |
| `POST`     | `/auth/password/verify`                                        | `{ email, code }`        | `{ accessToken, refreshToken, trainer }` |
| `POST`     | `/auth/refresh`                                                | `{ refreshToken }`       | `{ accessToken, refreshToken }`          |
| `POST`     | `/auth/logout`                                                 | —                        | `204`                                    |
| `GET`      | `/me`                                                          | —                        | perfil del entrenador                    |
| `GET/POST` | `/clients`, `/clients/:id` (`GET`/`PATCH`)                     | —                        | CRUD de clientes                         |
| `GET/POST` | `/routines`, `/routines/:id` (`PATCH`), `/routines/:id/assign` | `{ clientId }` en assign | CRUD + asignación                        |

Reglas que la app da por sentadas:

1. **El `trainerId` sale del JWT, nunca del request.** La app no lo manda en ningún
   endpoint. Si el BFF confiara en un `trainerId` del body, cualquiera leería los datos de
   otro entrenador.
2. Errores uniformes: `{ statusCode, message }`. `401` tanto en credenciales inválidas
   como en token expirado (la app hace un intento de `refresh` ante el `401`).
3. CORS habilitado para `capacitor://localhost`, `http://localhost` y
   `http://localhost:4200`.
4. El OTP de recuperación es de **6 dígitos**, numérico — la UI ya está construida así.
5. La app es **invitation-only**: el alta de entrenadores NO existe en la app. O la expone
   el BFF como endpoint administrativo, o se hace desde la consola de Supabase. Hay que
   decidirlo.

## Paridad de tooling con el repo de la app

Replicar, adaptado a NestJS:

- **Gitflow**: `main` + `develop`, ambas protegidas, required check `ci-gate`, PR
  obligatorio con 0 aprobaciones, sin force-push ni borrado, `enforce_admins: false`.
- **Commits**: Conventional Commits con commitlint + husky. Subject ≤ 72 chars.
- **Calidad**: ESLint con `--max-warnings 0` + Prettier.
- **Cobertura**: 80% mínimo en **las 4 métricas** (lines, statements, functions,
  branches). El paso de CI debe comparar **métrica por métrica** y validar que sean
  numéricas — el repo de la app tenía un bug donde promediaba y `"Unknown"` daba `NaN`,
  que pasaba el gate en falso. No repetir ese patrón; copiar el step ya corregido de
  `.github/workflows/ci.yml` de la app.
- **Plantillas**: `pull_request_template.md`, `ISSUE_TEMPLATE/` (bug, feature, task),
  `CODEOWNERS` con `* @cosyfps`.
- **CLAUDE.md propio**, incluyendo la regla de que el agente no ejecuta `git commit`,
  `git push` ni `git tag` — entrega los comandos como texto.
- **Prefijo de ticket**: usar `NEQUEBFF-<épica>.<historia>.<ticket>` para no colisionar
  con el `NEQUE-x.y.z` de la app.

## Backlog en paralelo: qué desbloquea qué

El backlog del BFF debe ordenarse por lo que la app necesita, no por capas técnicas.
Dependencias reales (los tickets 🔗 de la app están bloqueados hoy):

| Épica del BFF | Entrega                                                        | Desbloquea en la app                         |
| ------------- | -------------------------------------------------------------- | -------------------------------------------- |
| Fundación     | Scaffold NestJS, CI, gitflow, conexión a Supabase, healthcheck | —                                            |
| Auth          | Los 5 endpoints de `/auth`                                     | T-1.1.3, T-1.1.4, T-1.2.1, T-1.3.1 (Épica 1) |
| Perfil        | `GET /me`                                                      | T-4.1.1, T-4.1.2 (Épica 4)                   |
| Clientes      | CRUD de `/clients`                                             | T-2.1.2 y con él toda la Épica 2             |
| Rutinas       | CRUD de `/routines` + assign                                   | T-3.1.2 y con él toda la Épica 3             |
| Métricas      | Conteos para el dashboard                                      | T-5.1.1 (Épica 5)                            |

Camino crítico: **Auth primero**. Sin `/auth/login` la app no pasa de la pantalla de
inicio y las Épicas 2–5 quedan todas detrás.

Mientras el BFF no exista, en la app solo avanzan T-1.1.1 (`provideHttpClient` +
`apiBaseUrl`), T-1.1.2 (`TokenStorage`) y T-1.2.2 (guard).

## Decisiones abiertas para la sesión nueva

1. **Modelo de auth**: ¿el BFF proxea Supabase Auth y reenvía sus tokens, o emite su
   propio JWT y guarda Supabase como detalle de persistencia? Lo segundo es más hexagonal
   y desacopla del proveedor; lo primero es menos código.
2. **Alta de entrenadores**: endpoint admin protegido vs. consola de Supabase.
3. **Deploy**: dónde corre el BFF y de dónde saca `apiBaseUrl` la app en cada entorno.
4. **Esquema de datos**: `trainers`, `clients`, `routines` y la relación rutina↔cliente
   (¿una rutina se asigna a varios clientes?).

## Primer paso sugerido

Correr el skill `bff-design` para el diseño de la fase de auth **antes** de escribir
código, y recién después `hexagonal-service` para implementarla.

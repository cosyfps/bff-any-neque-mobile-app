# BFF Ñeque

Backend for Frontend en **NestJS con arquitectura hexagonal** para la app móvil Ñeque
(entrenadores personales). Es lo único con lo que habla la app: agrega Supabase — y lo que
venga después — detrás de un solo contrato HTTP, de modo que ninguna credencial
privilegiada viaje en el binario de la app.

```
App Ñeque (Angular 17 + Ionic + Capacitor)
        │  HTTP + JWT propio
        ▼
   BFF NestJS  ──service_role──> Supabase (Postgres + Auth)
               └──────────────> Flow.cl u otras APIs (a futuro)
```

Repo de la app: [`ui-any-neque-mobile-app`](https://github.com/cosyfps/ui-any-neque-mobile-app).

---

## Arranque

```bash
npm install
cp .env.example .env
npm run start:dev
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`
- Health: `http://localhost:3000/health`

Node 20.11+ en local; el CI corre sobre Node 22.

## Comandos

```bash
npm run start:dev      # nest start --watch
npm run start:prod     # node dist/main (requiere npm run build)
npm run build          # nest build
npm run lint           # eslint --max-warnings 0
npm run lint:fix       # eslint --fix
npm run format         # prettier --write
npm run format:check   # prettier --check
npm run typecheck      # tsc --noEmit
npm test               # jest
npm run test:watch     # jest --watch
npm run test:coverage  # jest --coverage (umbral 80% en las 4 métricas)
```

La secuencia que debe pasar antes de abrir un PR:

```bash
npm run lint; npm run format:check; npm run typecheck; npm run test:coverage; npm run build
```

## Estructura

**Vertical slicing + hexagonal.** Cada feature es una rebanada autocontenida con su propio
hexágono; no hay un `domain/` global compartido.

```
src/
├── main.ts                     # bootstrap: CORS, ValidationPipe, filtro global, Swagger
├── app.module.ts
├── configs/                    # configuración tipada por dominio (registerAs)
├── shared/
│   └── infrastructure/
│       └── filters/            # HttpExceptionFilter — formato { statusCode, message }
└── modules/
    └── <feature>/
        ├── domain/
        │   ├── entities/       # sin decoradores, sin NestJS, sin Swagger
        │   └── ports/          # interfaces + token de inyección
        ├── application/
        │   └── services/       # orquesta puertos y decide el modelo de salida
        ├── infrastructure/
        │   ├── adapters/       # implementan puertos (anti-corruption layer)
        │   ├── controllers/    # solo exponen, no deciden
        │   ├── dtos/           # contrato HTTP, con @ApiProperty
        │   └── mappers/        # solo si hay traducción real externo → dominio
        └── <feature>.module.ts # wiring: { provide: X_PORT, useClass: XAdapter }
```

`modules/health/` es la rebanada de referencia: copiar ese patrón al crear una nueva.

### Reglas de dependencia

- `domain/` no importa nada de NestJS, Swagger, Supabase ni ninguna librería externa.
- Un `port` devuelve entidades de dominio, nunca DTOs ni tipos de librería.
- Un `adapter` traduce infraestructura → dominio; **no** arma DTOs ni respuestas HTTP.
- Un `controller` no contiene lógica de negocio.

## Contrato con la app

El contrato completo, ticket por ticket, está en [`docs/BACKLOG.md`](docs/BACKLOG.md).
Lo que aplica a **todo** endpoint:

1. **El `trainerId` sale del claim `sub` del JWT, nunca del request.**
2. Errores uniformes `{ statusCode, message }`; el detalle de un 5xx no se filtra.
3. `401` en credenciales inválidas y en token expirado — la app reintenta con `refresh`.
4. `404`, no `403`, ante un recurso de otro entrenador.
5. CORS para `capacitor://localhost`, `http://localhost` y `http://localhost:4200`.

## Variables de entorno

Ver [`.env.example`](.env.example). Ninguna clave real se commitea; en producción viven en
el panel de Render.

| Variable                                            | Uso                                     |
| --------------------------------------------------- | --------------------------------------- |
| `PORT`                                              | Puerto HTTP (default `3000`)            |
| `APP_VERSION`                                       | Versión que reporta `GET /health`       |
| `CORS_ORIGINS`                                      | Orígenes permitidos, separados por coma |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`        | Acceso a Supabase (Épica 1)             |
| `JWT_SECRET` / `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Emisión de tokens propios (Épica 2)     |

> La `service_role` key **nunca** sale del BFF y nunca se expone a la app.

## Alta de entrenadores

La app es invitation-only: no tiene registro. Los entrenadores se crean **desde la consola
de Supabase** (usuario en Auth + fila en `trainers`). El procedimiento detallado se
documenta en T-1.2.5.

## Documentación

- [`docs/BACKLOG.md`](docs/BACKLOG.md) — épicas, historias, tickets, decisiones y tablero.
- [`docs/CONTEXT.MD`](docs/CONTEXT.MD) — contexto de arranque del proyecto.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — gitflow, ramas, commits y criterios de merge.

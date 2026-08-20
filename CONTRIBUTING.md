# Contribuir al BFF de Ñeque

Guía de trabajo del repositorio: cómo se organiza el backlog, cómo se nombran las ramas,
cómo se escriben los commits y qué tiene que pasar antes de mergear.

Mismas reglas que [`ui-any-neque-mobile-app`](https://github.com/cosyfps/ui-any-neque-mobile-app),
con el prefijo de ticket cambiado para que no colisionen.

---

## Jerarquía del backlog

| Nivel        | Qué es                                               | ¿Tiene rama? |
| ------------ | ---------------------------------------------------- | ------------ |
| **Épica**    | Objetivo macro. Agrupa historias.                    | No           |
| **Historia** | Agrupación lógica de tickets. Entrega una capacidad. | No           |
| **Ticket**   | Unidad micro de trabajo. Resuelve un issue concreto. | **Sí**       |

La regla central: **1 ticket = 1 rama = 1 PR**. Un ticket puede tener varios commits. Si un
ticket no cabe en un PR revisable, está mal dimensionado — divídelo.

**Excepción — tickets sin cambio de lógica.** Los que solo tocan documentación, plantillas
de GitHub o configuración del repositorio (`CONTRIBUTING.md`, `docs/`, `.github/`,
`README.md`) van **directo sobre `develop`**, sin rama propia. Todo ticket que toque `src/`,
`package.json` o los workflows de CI sí necesita su rama.

El backlog completo vive en [`docs/BACKLOG.md`](docs/BACKLOG.md).

---

## Ramas

```
main ────────────────────────────────────────────────●──── tag v1.0.0
                                                    ╱
release/1.0.0 ──────────────────────────────────────●
                                                   ╱
develop ──●───●───●───●───●───●───●───●───●───●──
          ╱   ╱   ╱   ╱   ╱   ╱   ╱   ╱   ╱
   feat/NEQUEBFF-2.1.1 … chore/NEQUEBFF-7.3.1
```

| Rama        | Rol                                                              |
| ----------- | ---------------------------------------------------------------- |
| `main`      | Producción. Solo recibe merges desde `release/*` o `hotfix/*`.   |
| `develop`   | Integración. Todos los tickets apuntan aquí.                     |
| `<tipo>/…`  | Rama de ticket. Nace de `develop` y vuelve a `develop`.          |
| `release/*` | Corte de versión. Nace de `develop`, mergea a `main` y se tagea. |
| `hotfix/*`  | Urgencia en producción. **Única rama que nace de `main`.**       |

> `main` y `develop` están protegidas: required check `ci-gate`, PR obligatorio con **0
> aprobaciones**, sin force-push ni borrado de rama, `enforce_admins: false`.

### Nomenclatura

```
<tipo>/NEQUEBFF-<épica>.<historia>.<ticket>-<slug-en-kebab-case>
```

```
feat/NEQUEBFF-2.2.2-login-endpoint
fix/NEQUEBFF-4.2.2-clients-cross-trainer-leak
test/NEQUEBFF-7.2.1-integration-qa-checklist
ci/NEQUEBFF-0.2.2-ci-pipeline
```

El `<tipo>` usa los mismos valores que acepta commitlint: `feat`, `fix`, `docs`, `style`,
`refactor`, `test`, `chore`, `perf`, `ci`, `revert`.

---

## Commits

Conventional Commits, validados por `commitlint` en el hook `commit-msg`.

```
<tipo>(<scope>): <descripción en imperativo>
```

- Subject de máximo **72 caracteres**.
- Líneas del body de máximo 100 caracteres.
- El hook `pre-commit` corre `lint-staged` (ESLint + Prettier sobre lo staged).

```
feat(auth): emitir access y refresh token propios
fix(clients): devolver 404 ante cliente de otro entrenador
ci(coverage): validar las 4 metricas por separado
```

---

## Antes de abrir un PR

```bash
npm run lint; npm run format:check; npm run typecheck; npm run test:coverage; npm run build
```

Las 4 métricas de cobertura (lines, statements, functions, branches) deben superar el
**80%**. El gate de CI las compara **una por una** y exige que sean numéricas: un
`"Unknown"` de Istanbul no vuelve a pasar por promedio como `NaN`.

## Criterios de merge

Un PR mergea cuando:

1. `ci-gate` está en verde.
2. El diff está acotado al ticket — sin refactors oportunistas de archivos ajenos.
3. Todo endpoint nuevo o modificado respeta las reglas transversales del contrato
   (`trainerId` del JWT, errores uniformes, `401`/`404` según corresponda).
4. Si cambia el contrato que consume la app, el PR lo declara y se actualiza también
   `docs/BACKLOG.md` del repo de la app.
5. El tablero de `docs/BACKLOG.md` queda actualizado.

## Checklist de arquitectura

Antes de dar por terminado un ticket que agrega una feature:

- [ ] La feature vive en `src/modules/<feature>/` con su propio hexágono.
- [ ] `domain/` no importa NestJS, Swagger, Supabase ni ninguna librería externa.
- [ ] El puerto devuelve entidades de dominio y define su token de inyección.
- [ ] El adapter implementa el puerto y no arma DTOs ni respuestas HTTP.
- [ ] El controller no tiene lógica de negocio.
- [ ] El wiring `{ provide: X_PORT, useClass: XAdapter }` está en el módulo de la feature.
- [ ] Hay specs de los casos de error, no solo del happy path, con
      `Test.createTestingModule()` (sin instancias manuales).

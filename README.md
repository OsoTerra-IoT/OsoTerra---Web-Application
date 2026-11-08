# OsoSense Web Application

Aplicación web de OsoSense (Oso Terra) para monitorear la salinidad del suelo. Tiene dos áreas
con la misma URL base `/app`: **Productor** (fincas, parcelas, sensores, alertas) y **Asesor**
(clientes vinculados, comparación, reportes en PDF, calibración). Está hecha con Angular 22,
Angular Material, ngx-translate (español e inglés) y Vitest.

## Requisitos

- Node.js 24 y npm 11 (es lo que usa el flujo de GitHub Pages).

## Cómo levantarla

```bash
npm ci
npm start                                 # contra el Backend en Railway (configuración por defecto)
npx ng serve --configuration fake-api     # sin Backend: API falsa en el navegador, con datos de demo
npx ng serve --configuration local-api    # contra un Backend local en http://localhost:8080/api/v1
```

La app queda en http://localhost:4200. Las URL de cada configuración están en
`src/environments/`. Con `?demo=1` en la URL se activa, solo en esa pestaña, el modo de demo con
escenarios numerados.

## Cómo probar

```bash
npx ng test --watch=false     # pruebas unitarias y de pantallas (Vitest)
npm run check:i18n            # claves es/en iguales, mismos parámetros, sin texto fijo en plantillas
npm run format:check          # Prettier
```

Las pruebas usan la API falsa, sin latencia (`src/app/core/api/testing.ts`).

## Cómo construir

```bash
npm run build                 # salida en dist/osoterra-web-app/browser
```

El flujo `.github/workflows/deploy-pages.yml` publica en GitHub Pages cada push a `develop`:
corre `check:i18n` y `ng build --base-href /<repositorio>/`.

## Usuarios de la API falsa

Solo existen con la API falsa (`--configuration fake-api`, o las pruebas). Contraseña de todos:
`OsoTerra2026!`.

| Correo | Rol | Notas |
| --- | --- | --- |
| `farmer@osoterra.demo` | Productor | Elena Ramos; parcelas Sector Norte y La Quebrada |
| `farmer2@osoterra.demo` | Productor | Carla Mendoza |
| `farmer3@osoterra.demo` | Productor | Rosa Quispe; sin asesor, sirve para invitar |
| `advisor@osoterra.demo` | Asesor | Diego Torres; vinculado a `farmer` y `farmer2` |
| `advisor2@osoterra.demo` | Asesor | Lucía Vargas; invitación pendiente a `farmer` |

Con el Backend real (Railway o local) se usan cuentas creadas con el registro de la app.

## Estructura

- `src/app/core/api`: clientes HTTP de cada bounded context, mapeadores y la API falsa (`fake/`).
- `src/app/core/data`: servicios con señales (`MonitoringService`, `AdvisoryLinkService`).
- `src/app/features`: pantallas por área (`dashboard`, `plots`, `alerts`, `devices`, `account`,
  `advisor`, `auth`).
- `public/i18n/es.json` y `en.json`: todo texto visible va aquí; `check:i18n` lo verifica.
- `docs/`: [ADVISOR-HANDOFF.md](docs/ADVISOR-HANDOFF.md), [IMPLEMENTATION.md](docs/IMPLEMENTATION.md)
  y [VALIDATION.md](docs/VALIDATION.md).

## Convenciones

GitFlow (`main`, `develop`, `feature/*`) y Conventional Commits con scope, por ejemplo
`fix(alerts): show error when acknowledge fails`.

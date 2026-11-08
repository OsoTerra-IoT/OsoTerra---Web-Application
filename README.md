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

Los escenarios 7 y 8 muestran la contingencia de salinidad del dispositivo (lavado automático con
bomba): el 7 con la parcela bajando de Muy alto a En vigilancia tras dos lavados y el 8 con los tres
lavados agotados, donde una persona debe actuar. Usan el modelo de datos y la API falsa existentes:
el dispositivo registra cada lavado como acción correctiva sin cuenta de persona y con la nota
`AUTO_FLUSH <usados>/<máximo> <segundos>s`.

## Suscripción y límite de parcelas

La pantalla **Suscripción** (productor y asesor) usa los endpoints del Backend `GET /subscription-plans`,
`GET /subscriptions/mine`, `POST /subscriptions` y `POST /subscriptions/{id}/cancellation`. Muestra los
planes con su precio y su límite de parcelas, el plan actual con las parcelas usadas (`quotaConsumed` de
`quotaTotal`, que el Backend calcula con las parcelas activas) y los botones para contratar, cambiar o
cancelar, siempre con confirmación y con estados de carga y de error.

- El plan actual es la suscripción activa y vigente con la cuota más grande, igual que el Backend; sin
  suscripción activa no hay límite de parcelas.
- Un plan gratis empieza al instante y reemplaza al actual (la app cancela el anterior). Un plan de pago
  solo se **solicita**: queda en `PENDING_PAYMENT` y el plan actual no cambia.
- **El cobro con Stripe queda fuera de esta app.** No hay formulario de tarjeta ni pasarela: la
  activación de un plan de pago la hace el Backend cuando recibe el webhook del proveedor de pagos.
- Al registrar una parcela por encima del límite el Backend responde `409`; el formulario de parcela lo
  explica (con el límite del plan y un enlace a los planes) en español e inglés.
- La API falsa responde lo mismo: `POST /subscriptions` (gratis activa, pago queda pendiente), la
  cancelación, `quotaConsumed` real y el `409` al pasar el límite. En la demo, `farmer` (plan Free, 2 de 2)
  ya está en el límite y `farmer2` (plan Basic, 2 de 10) puede cambiar de plan.

## Llamadas al cargar el tablero

`MonitoringService` ya no hace las llamadas en cascada de antes: el catálogo de cultivos se pide junto con
las fincas, las parcelas se cargan con un máximo de 4 a la vez y, dentro de cada parcela, dispositivos
(con sus calibraciones), lecturas y alertas (con sus acciones) no se esperan entre sí. El productor ya no
pide calibraciones, que solo leen las pantallas del asesor, y activar un sensor recarga solo esa parcela.
Peticiones medidas con la API falsa en `monitoring-requests.spec.ts` (sin contar el inicio de sesión):

| Caso                                         | Antes | Después                                          |
| -------------------------------------------- | ----- | ------------------------------------------------ |
| Productor `farmer` (2 parcelas)              | 12    | 10                                               |
| Productor `farmer2` (2 parcelas)             | 13    | 11                                               |
| Asesor (4 parcelas de 2 clientes)            | 24    | 24 (mismas peticiones, menos niveles en cascada) |
| Activar un sensor (productor con 3 parcelas) | 18    | 6                                                |

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
- `src/app/core/data`: servicios con señales (`MonitoringService`, `AdvisoryLinkService`, `SubscriptionService`).
- `src/app/features`: pantallas por área (`dashboard`, `plots`, `alerts`, `devices`, `account`,
  `advisor`, `auth`).
- `public/i18n/es.json` y `en.json`: todo texto visible va aquí; `check:i18n` lo verifica.
- `docs/`: [ADVISOR-HANDOFF.md](docs/ADVISOR-HANDOFF.md), [IMPLEMENTATION.md](docs/IMPLEMENTATION.md)
  y [VALIDATION.md](docs/VALIDATION.md).

## Convenciones

GitFlow (`main`, `develop`, `feature/*`) y Conventional Commits con scope, por ejemplo
`fix(alerts): show error when acknowledge fails`.

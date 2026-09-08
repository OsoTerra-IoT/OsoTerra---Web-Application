# Área del Asesor Técnico: trabajo pendiente

El área del Productor se conserva. Por acuerdo de reparto, se retiraron las pantallas del Asesor y su barra lateral. Sus rutas cargan componentes vacíos con archivos TypeScript, HTML y SCSS independientes, listos para desarrollar.

Se conserva una barra superior mínima con idioma y cierre de sesión para poder cambiar de cuenta. No hay tablero, búsqueda, notificaciones, breadcrumbs ni navegación lateral en este layout.

## Dónde trabajar

- Layout del asesor: `src/app/core/layout/advisor-layout/`.
- Rutas de entrada del asesor: `src/app/features/advisor/advisor-workspace.routes.ts`.
- Rutas especializadas: `src/app/features/advisor/advisor.routes.ts`.
- `advisorWorkspaceGuard` selecciona este layout únicamente para el rol Advisor. El layout original y las vistas del Productor mantienen sus archivos.

| Pantalla por desarrollar | URL | Archivos base dentro de features/advisor |
| --- | --- | --- |
| Inicio multiparcela | /app/home | home/advisor-home.* |
| Parcelas supervisadas | /app/plots | plots/advisor-plots.* |
| Detalle de parcela | /app/plots/:id | plot-detail/advisor-plot-detail.* |
| Alertas | /app/alerts | alerts/advisor-alerts.* |
| Comparador | /app/advisor/compare | comparison/comparison.* |
| Reportes y exportación PDF | /app/advisor/reports | reports/reports.* |
| Clientes | /app/advisor/clients | clients/clients.* |
| Calibración | /app/advisor/calibration | calibration/calibration.* |
| Suscripción | /app/subscription | subscription/advisor-subscription.* |
| Configuración | /app/settings | settings/advisor-settings.* |

Las rutas pueden abrirse directamente escribiendo la URL después de iniciar sesión como Asesor. Las rutas exclusivas del Productor redirigen al inicio vacío del Asesor.

## Bases que ya puede reutilizar el compañero

- `core/models/`: interfaces User, Plot, Crop, Device, SoilReading y SalinityAlert.
- `AuthService`: sesión mock y comprobación de rol.
- `MonitoringService`: parcelas asignadas, lecturas, clientes a partir de propietarios, alertas, acciones y registro de calibración. Los datos de demostración siguen disponibles aunque no se dibujen.
- `shared/components/`: estado de salinidad, gráfica con tabla accesible y selector de idioma.
- `public/i18n/en.json` y `es.json`: claves preparadas para las pantallas retiradas.
- `src/styles.scss`: tema Material y estilos comunes.
- jsPDF sigue instalado, pero se retiró la implementación de reportes del asesor; debe desarrollarse de nuevo en su pantalla.

## Orden sugerido

1. Barra lateral propia del Asesor y navegación entre los contenedores.
2. Inicio, listado y detalle de parcelas supervisadas.
3. Alertas, comparador y clientes.
4. Reportes/PDF, calibración, suscripción y configuración.

Para nuevos textos, añadir las claves en ambos idiomas y ejecutar `npm run check:i18n`. No modificar las pantallas bajo `features/plots`, `features/dashboard`, `features/alerts` ni el layout original para desarrollar la interfaz del Asesor: esas implementaciones sirven al Productor.

Las pruebas de rutas actualmente comprueban que el Asesor esté vacío y sin sidebar. Al implementar cada pantalla, actualizar sus expectativas en `src/app/app.spec.ts`, manteniendo los casos de aislamiento y navegación del Productor.

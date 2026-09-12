# Área del Asesor Técnico

El área del Productor se conserva sin cambios. Esta entrega implementa las diez pantallas del Asesor
que estaban vacías, su barra lateral propia y la exportación de reportes en PDF.

El layout del Asesor es independiente del layout del Productor: `advisorWorkspaceGuard` lo selecciona
con `canMatch` únicamente para el rol Advisor, de modo que ambas áreas conviven sobre la ruta `/app`
sin compartir componentes de pantalla.

## Dónde está cada cosa

- Layout y barra lateral del asesor: `src/app/core/layout/advisor-layout/`.
- Enlaces de la barra lateral: `src/app/core/layout/advisor-layout/advisor-navigation.ts`.
- Rutas de entrada del asesor: `src/app/features/advisor/advisor-workspace.routes.ts`.
- Rutas especializadas: `src/app/features/advisor/advisor.routes.ts`.

| Pantalla | URL | Archivos dentro de features/advisor |
| --- | --- | --- |
| Inicio multiparcela | /app/home | home/advisor-home.* |
| Parcelas supervisadas | /app/plots | plots/advisor-plots.* |
| Detalle de parcela | /app/plots/:id | plot-detail/advisor-plot-detail.* |
| Alertas | /app/alerts | alerts/advisor-alerts.*, alerts/advisor-action-dialog.* |
| Comparador | /app/advisor/compare | comparison/comparison.* |
| Reportes y exportación PDF | /app/advisor/reports | reports/reports.* |
| Clientes | /app/advisor/clients | clients/clients.* |
| Calibración | /app/advisor/calibration | calibration/calibration.* |
| Suscripción | /app/subscription | subscription/advisor-subscription.* |
| Configuración | /app/settings | settings/advisor-settings.* |

Las rutas exclusivas del Productor (`/app/devices`, `/app/my-advisor`, creación y edición de fincas y
parcelas) redirigen al inicio del Asesor.

## Qué hace cada pantalla

- **Inicio**: cuatro indicadores (clientes, parcelas y superficie, alertas activas, dispositivos
  conectados) y una tabla que ordena las parcelas por cercanía al umbral del cultivo, con cliente,
  cultivo, conductividad medida, umbral ECe y porcentaje del umbral.
- **Parcelas supervisadas**: agrupadas por cliente, con filtros de cliente, cultivo y nivel de
  salinidad sobre el buscador compartido.
- **Detalle de parcela**: pestañas de estado actual, historial, alertas y telemetría. El estado añade
  el porcentaje del umbral y una estimación lineal de pérdida de rendimiento (Maas y Hoffman); la
  telemetría muestra el desplazamiento de calibración del equipo.
- **Alertas**: contadores por severidad, filtros por severidad, estado, cliente y parcela, y registro
  de acciones correctivas mediante un diálogo propio del Asesor.
- **Comparador**: de 2 a 4 parcelas, cambio de métrica, tabla accesible y variación del periodo.
- **Clientes**: directorio derivado de los propietarios de las parcelas asignadas, con contacto,
  ubicación, fincas, superficie, alertas abiertas y parcelas con su nivel actual.
- **Calibración**: registro de un punto (sensor y ECe de laboratorio) con su historial por equipo.
- **Reportes**: selección de parcelas, vista previa en pantalla y exportación del mismo contenido a
  PDF con jsPDF cargado de forma diferida.
- **Suscripción** y **Configuración**: plan del prototipo con el uso de la sesión, y perfil con CIP,
  idioma y cierre de sesión.

## Bases reutilizadas

- `core/models/`: interfaces User, Plot, Crop, Device, SoilReading y SalinityAlert sin cambios.
- `AuthService`: se añadió el segundo Productor de demostración (`farmer2@osoterra.demo`) y
  `findUser` para las relaciones del directorio.
- `MonitoringService`: se añadieron `clients()`, `owner()`, `salinityLevel()` y `level()`. Las bandas
  de severidad de demostración viven ahora en el servicio y las consume también
  `shared/components/salinity-status`.
- `shared/components/`: estado de salinidad, gráfica con tabla accesible y selector de idioma.
- `src/styles.scss`: tema Material y clases comunes. No se modificó: los estilos nuevos del Asesor
  están en el SCSS de su layout y de cada pantalla.

## Límites

Sigue siendo un prototipo de frontend: sin backend, sin correo real, sin facturación y sin sensores
físicos. La calibración registra un desplazamiento de un punto y no reescribe mediciones. Cualquier
API real debe repetir la autorización en el servidor.

Para nuevos textos, añadir las claves en ambos idiomas y ejecutar `npm run check:i18n`.
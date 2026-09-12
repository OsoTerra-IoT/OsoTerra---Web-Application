# Validación actual

- Área del Productor: sin cambios. El diff frente a `main` no toca `features/plots`,
  `features/dashboard`, `features/alerts`, `features/devices`, `features/account`, `features/auth`,
  el layout original ni `src/styles.scss`.
- Área del Asesor: diez pantallas implementadas con TS, HTML y SCSS propios, barra lateral y
  breadcrumbs propios, diálogo de acción correctiva propio y exportación PDF con jsPDF diferido.
- Núcleo: `AuthService.findUser`, segundo Productor de demostración y
  `MonitoringService.clients/owner/salinityLevel/level`. Las reglas de acceso existentes no se
  relajaron: el directorio y las alertas del Asesor solo exponen parcelas ya asignadas a su cuenta.
- Pruebas: **32 aprobadas en 4 archivos**, incluidas las rutas del Asesor con su barra lateral, la
  redirección de rutas exclusivas del Productor, el listado de alertas de todos los clientes, el
  cambio de idioma dentro del espacio del Asesor y las regresiones del Productor.
- Internacionalización: 252 claves por idioma y comprobación sin errores.
- Compilación de producción: correcta y sin advertencias. Las dependencias CommonJS opcionales de
  jsPDF se declaran en `angular.json`.
- Formato: `npm run format:check` sin diferencias.

Comandos ejecutados:

```bash
npm run check:i18n
npm run format:check
npm test -- --watch=false
npm run build
```

No se realizó auditoría visual en navegador ni certificación WCAG AA. El mock continúa sin backend,
correo, pagos ni sensores reales.

Consultar [ADVISOR-HANDOFF.md](ADVISOR-HANDOFF.md) para la distribución del área del Asesor.
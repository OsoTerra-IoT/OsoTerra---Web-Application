# Validación actual

Estado de la rama `feature/web-pending-fixes` (sobre `develop`). Los números salen de ejecuciones
reales, no de la revisión anterior.

## Alcance

- Dos áreas con el API real de OsoSense: Productor y Asesor (diez pantallas, barra lateral propia,
  exportación PDF con jsPDF diferido). Las rutas del Asesor viven solo en su espacio
  (`advisorWorkspaceGuard`); un Productor que abre `/app/advisor/...` vuelve a Inicio.
- Vínculo asesor–productor: el asesor invita por correo, cancela o deja de supervisar; el productor
  acepta, rechaza o termina el vínculo.
- Tres configuraciones de API: Railway (por defecto), API falsa en el navegador (`fake-api`) y
  Backend local (`local-api`).

## Comportamiento ante fallos

- Cada parcela se carga por separado: si falla una, las demás se muestran y Inicio avisa cuál no
  cargó. Una sesión vencida (401) sigue cerrando la sesión.
- Marcar una alerta como atendida solo lo muestra si el API lo aceptó; si falla, la alerta sigue
  abierta y se muestra el error.

## Resultados

- Pruebas: **78 aprobadas en 11 archivos** (`npx ng test --watch=false`). La prueba de invitar por
  correo (`advisory-links.spec.ts`) puede agotar el tiempo si la máquina está cargada y pasa sola.
- Internacionalización: 406 claves por idioma, `npm run check:i18n` sin errores.
- Compilación de producción: `npm run build` correcta.
- Formato: `npm run format:check` **no está limpio** (reporta 99 archivos sin formatear, la mayoría
  fuera de lo que toca esta rama). No se ha normalizado todo el repositorio.

Comandos ejecutados:

```bash
npx ng test --watch=false
npm run check:i18n
npm run build
```

## Pendiente

- No se corrió la Web contra el Backend real en esta rama; las pruebas usan la API falsa con el mismo
  contrato.
- Sin auditoría visual completa en navegador ni certificación WCAG AA.
- Suscripción sin compra ni cambio de plan; los endpoints de Analytics no se usan (los reportes se
  arman en el navegador).
- Muchas llamadas en cascada al cargar el tablero (una por parcela, sensor y alerta resuelta).

Consultar [ADVISOR-HANDOFF.md](ADVISOR-HANDOFF.md) para la distribución del área del Asesor.

# Implementaci?n de OsoTerra IoT

> Referencia de la implementaci?n inicial. El layout, las rutas y las pantallas del Asesor fueron separados despu?s; consultar [ADVISOR-HANDOFF.md](ADVISOR-HANDOFF.md) para la estructura vigente de esa ?rea. El Productor se conserva.

## 1. Crear desde cero en el Escritorio

Estos comandos reproducen la inicializaci?n. No ejecutarlos sobre la carpeta ya creada.

### Windows PowerShell

```powershell
cd $HOME\Desktop
npx --yes @angular/cli@22.1.7 new osoterra-web-app --routing --style=scss --ssr=false --defaults --skip-git --package-manager=npm
cd osoterra-web-app
npx ng add @angular/material --theme=custom --typography=false --skip-confirmation
npm install @ngx-translate/core @ngx-translate/http-loader jspdf @fontsource/material-icons
npm start -- --host 127.0.0.1 --port 4200
```

Si Angular CLI est? instalado globalmente, el comando equivalente solicitado es:

```powershell
ng new osoterra-web-app --routing --style=scss --ssr=false
```

En PowerShell, se puede usar npm.cmd o npx.cmd cuando la pol?tica de ejecuci?n impide los wrappers .ps1.

### Linux / macOS

```bash
cd ~/Desktop
npx --yes @angular/cli@22.1.7 new osoterra-web-app --routing --style=scss --ssr=false --defaults --skip-git --package-manager=npm
cd osoterra-web-app
npx ng add @angular/material --theme=custom --typography=false --skip-confirmation
npm install @ngx-translate/core @ngx-translate/http-loader jspdf @fontsource/material-icons
npm start -- --host 127.0.0.1 --port 4200
```

En el proyecto entregado, package-lock.json fija las versiones efectivas. Usar npm ci para reproducirlas. La inicializaci?n genera el scaffold; las implementaciones espec?ficas descritas debajo ya est?n escritas en este repositorio.

## 2. Arquitectura y estructura completa

- core: modelos del dominio, servicios singleton, autenticaci?n, permisos, idioma y layout.
- shared: componentes de idioma, salinidad y gr?ficas reutilizados en varias funcionalidades.
- features: rutas y componentes standalone cargados por funcionalidad.
- public/i18n/en.json y es.json: todos los textos visibles de las plantillas; se usan claves tambi?n para ARIA y validaciones.
- src/styles.scss: tema SCSS de Material 3 y estilos responsivos de OsoTerra.
- scripts/check-i18n.mjs: verificaci?n de claves, par?metros y textos de plantilla.

```text
src/app/
??? core
?   ??? auth
?   ?   ??? auth.guard.ts
?   ?   ??? auth.service.spec.ts
?   ?   ??? auth.service.ts
?   ??? data
?   ?   ??? demo-data.ts
?   ?   ??? monitoring.service.spec.ts
?   ?   ??? monitoring.service.ts
?   ??? i18n
?   ?   ??? locale.service.ts
?   ??? layout
?   ?   ??? app-layout.html
?   ?   ??? app-layout.ts
?   ?   ??? navigation.ts
?   ??? models
?   ?   ??? crop.model.ts
?   ?   ??? device.model.ts
?   ?   ??? index.ts
?   ?   ??? plot.model.ts
?   ?   ??? salinity-alert.model.ts
?   ?   ??? soil-reading.model.ts
?   ?   ??? user.model.ts
?   ??? webmcp
?       ??? plot-tools.service.ts
??? features
?   ??? account
?   ?   ??? account.html
?   ?   ??? account.ts
?   ??? advisor
?   ?   ??? calibration
?   ?   ?   ??? calibration.html
?   ?   ?   ??? calibration.ts
?   ?   ??? clients
?   ?   ?   ??? clients.html
?   ?   ?   ??? clients.ts
?   ?   ??? comparison
?   ?   ?   ??? comparison.html
?   ?   ?   ??? comparison.ts
?   ?   ??? reports
?   ?   ?   ??? reports.html
?   ?   ?   ??? reports.ts
?   ?   ??? advisor.routes.ts
?   ??? alerts
?   ?   ??? alerts-center.html
?   ?   ??? alerts-center.ts
?   ?   ??? corrective-action-dialog.html
?   ?   ??? corrective-action-dialog.ts
?   ??? auth
?   ?   ??? login
?   ?   ?   ??? login.html
?   ?   ?   ??? login.ts
?   ?   ??? password
?   ?   ?   ??? password.html
?   ?   ?   ??? password.ts
?   ?   ??? registration
?   ?   ?   ??? registration.html
?   ?   ?   ??? registration.ts
?   ?   ??? role-selection
?   ?   ?   ??? role-selection.html
?   ?   ?   ??? role-selection.ts
?   ?   ??? terms
?   ?   ?   ??? terms.html
?   ?   ?   ??? terms.ts
?   ?   ??? auth-frame.html
?   ?   ??? auth-frame.ts
?   ?   ??? auth.routes.ts
?   ??? dashboard
?   ?   ??? dashboard.html
?   ?   ??? dashboard.ts
?   ??? devices
?   ?   ??? devices.html
?   ?   ??? devices.ts
?   ??? plots
?       ??? farm-form
?       ?   ??? farm-form.html
?       ?   ??? farm-form.ts
?       ??? plot-detail
?       ?   ??? plot-detail.html
?       ?   ??? plot-detail.ts
?       ??? plot-form
?       ?   ??? plot-form.html
?       ?   ??? plot-form.ts
?       ??? plot-list
?       ?   ??? plot-list.html
?       ?   ??? plot-list.ts
?       ??? plots.routes.ts
??? shared
?   ??? components
?   ?   ??? language-switcher.html
?   ?   ??? language-switcher.ts
?   ?   ??? salinity-status.html
?   ?   ??? salinity-status.spec.ts
?   ?   ??? salinity-status.ts
?   ?   ??? trend-chart.html
?   ?   ??? trend-chart.ts
?   ??? ui-imports.ts
??? app.config.ts
??? app.html
??? app.routes.ts
??? app.scss
??? app.spec.ts
??? app.ts
```

## 3. Modelos e interfaces principales

Los tipos de rol y locale son uniones cerradas. User es una uni?n discriminada: cipNumber es obligatorio solamente en Advisor. Las marcas de tiempo usan ISO 8601; unidades y base de conductividad son expl?citas.

### core/models/user.model.ts

```typescript
export type UserRole = 'Farmer' | 'Advisor';
export type AppLocale = 'en_US' | 'es_419';

interface UserBase {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  province: string;
  locale: AppLocale;
  termsAcceptedAt: string;
}

export type User = UserBase &
  ({ role: 'Farmer'; advisorId?: string } | { role: 'Advisor'; cipNumber: string });

export interface LoginCredentials {
  email: string;
  password: string;
}
export interface RegistrationRequest extends LoginCredentials {
  firstName: string;
  lastName: string;
  department: string;
  province: string;
  role: UserRole;
  cipNumber?: string;
  acceptsTerms: boolean;
}
```

### core/models/plot.model.ts

```typescript
export interface Farm {
  id: string;
  name: string;
  ownerId: string;
  department: string;
  province: string;
}

export interface Plot {
  id: string;
  farmId: string;
  ownerId: string;
  advisorIds: string[];
  name: string;
  latitude: number;
  longitude: number;
  areaHectares: number;
  cropId: string;
  deviceId?: string;
  createdAt: string;
}
```

### core/models/crop.model.ts

```typescript
export interface Crop {
  id: string;
  nameKey: string;
  scientificName: string;
  salinityThresholdDsM: number;
  yieldLossPercentPerDsM: number;
  measurementBasis: 'ECe';
  reference: { authors: string; year: number; title: string; url: string };
}
```

### core/models/device.model.ts

```typescript
export interface Device {
  id: string;
  plotId: string;
  serialNumber: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  batteryPercent: number;
  signalDbm: number;
  lastSeenAt: string;
  firmwareVersion: string;
  calibration?: {
    sensorDsM: number;
    laboratoryEceDsM: number;
    offsetDsM: number;
    calibratedAt: string;
    advisorId: string;
    notes: string;
  };
}
```

### core/models/soil-reading.model.ts

```typescript
export interface SoilReading {
  id: string;
  plotId: string;
  deviceId: string;
  recordedAt: string;
  conductivityDsM: number;
  measurementBasis: 'ECe' | 'BULK_EC';
  moisturePercent: number;
  temperatureCelsius: number;
  quality: 'VALID' | 'SUSPECT' | 'INVALID';
}
```

### core/models/salinity-alert.model.ts

```typescript
export type AlertSeverity = 'WATCH' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
export type CorrectiveActionType =
  'INSPECTION' | 'IRRIGATION_REVIEW' | 'DRAINAGE_REVIEW' | 'LAB_SAMPLE';

export interface CorrectiveAction {
  id: string;
  type: CorrectiveActionType;
  performedAt: string;
  notes: string;
  createdBy: string;
}

export interface SalinityAlert {
  id: string;
  plotId: string;
  readingId: string;
  severity: AlertSeverity;
  status: AlertStatus;
  conductivityDsM: number;
  thresholdDsM: number;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  actions: CorrectiveAction[];
}
```

## 4. Autenticaci?n mock y guards

El servicio no usa un backend ni persiste contrase?as. Login valida credenciales de demostraci?n, register aplica las reglas del formulario y los tokens de recuperaci?n tienen caducidad y un solo uso. El estado se expresa con signals.

### core/auth/auth.service.ts

```typescript
import { computed, Injectable, signal } from '@angular/core';
import { LoginCredentials, RegistrationRequest, User, UserRole } from '../models';

export const DEMO_PASSWORD = 'OsoTerra2026!';
const base = {
  department: 'Lima',
  province: 'Huaral',
  locale: 'en_US' as const,
  termsAcceptedAt: '2026-09-01T12:00:00Z',
};
export const DEMO_USERS: readonly User[] = [
  {
    ...base,
    id: 'farmer-1',
    firstName: 'Elena',
    lastName: 'Ramos',
    email: 'farmer@osoterra.demo',
    role: 'Farmer',
    advisorId: 'advisor-1',
  },
  {
    ...base,
    id: 'advisor-1',
    firstName: 'Diego',
    lastName: 'Torres',
    email: 'advisor@osoterra.demo',
    role: 'Advisor',
    cipNumber: '123456',
  },
];

/** Development adapter. Accounts, passwords and reset tokens live in memory only.
 * A production API must authenticate, authorize every request and issue secure sessions.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUser = signal<User | null>(null);
  private readonly accounts = new Map(
    DEMO_USERS.map((user) => [user.email, { user, password: DEMO_PASSWORD }]),
  );
  private readonly resetTokens = new Map<string, { email: string; expiresAt: number }>();
  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isAdvisor = computed(() => this.user()?.role === 'Advisor');

  login(credentials: LoginCredentials): boolean {
    const account = this.accounts.get(credentials.email.trim().toLowerCase());
    if (!account || account.password !== credentials.password) return false;
    this.currentUser.set(account.user);
    return true;
  }

  register(request: RegistrationRequest): 'SUCCESS' | 'EXISTS' | 'INVALID' {
    const email = request.email.trim().toLowerCase();
    if (
      !request.acceptsTerms ||
      !request.firstName.trim() ||
      !request.lastName.trim() ||
      !request.department.trim() ||
      !request.province.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      request.password.length < 12 ||
      !['Farmer', 'Advisor'].includes(request.role) ||
      (request.role === 'Advisor' && !/^\d{4,10}$/.test(request.cipNumber ?? ''))
    )
      return 'INVALID';
    if (this.accounts.has(email)) return 'EXISTS';
    const common = {
      id: crypto.randomUUID(),
      email,
      firstName: request.firstName.trim(),
      lastName: request.lastName.trim(),
      department: request.department.trim(),
      province: request.province.trim(),
      locale: 'en_US' as const,
      termsAcceptedAt: new Date().toISOString(),
    };
    const user: User =
      request.role === 'Advisor'
        ? { ...common, role: 'Advisor', cipNumber: request.cipNumber! }
        : { ...common, role: 'Farmer' };
    this.accounts.set(email, { user, password: request.password });
    this.currentUser.set(user);
    return 'SUCCESS';
  }

  hasRole(roles: readonly UserRole[]): boolean {
    const user = this.user();
    return !!user && roles.includes(user.role);
  }

  requestPasswordReset(email: string): string | null {
    const normalizedEmail = email.trim().toLowerCase();
    if (!this.accounts.has(normalizedEmail)) return null;
    for (const [key, entry] of this.resetTokens)
      if (entry.email === normalizedEmail) this.resetTokens.delete(key);
    const token = crypto.randomUUID();
    this.resetTokens.set(token, { email: normalizedEmail, expiresAt: Date.now() + 15 * 60_000 });
    return token;
  }

  resetPassword(token: string, password: string): boolean {
    const reset = this.resetTokens.get(token);
    if (!reset || reset.expiresAt <= Date.now() || password.length < 12) return false;
    const account = this.accounts.get(reset.email);
    if (!account) return false;
    account.password = password;
    this.resetTokens.delete(token);
    this.logout();
    return true;
  }

  logout(): void {
    this.currentUser.set(null);
  }
}
```

### core/auth/auth.guard.ts

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from '../models';

export const authGuard: CanActivateFn = (_route, state) => {
  return (
    inject(AuthService).isAuthenticated() ||
    inject(Router).createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } })
  );
};

export const roleGuard: CanActivateChildFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated())
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  const roles = route.data['roles'] as readonly UserRole[] | undefined;
  return !roles || auth.hasRole(roles) || router.createUrlTree(['/app/home']);
};
```

### app.routes.ts

```typescript
import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'app/home' },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    canActivateChild: [roleGuard],
    data: { breadcrumb: 'nav.home' },
    loadComponent: () => import('./core/layout/app-layout').then((m) => m.AppLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'plots',
        data: { breadcrumb: 'nav.plots' },
        loadChildren: () => import('./features/plots/plots.routes').then((m) => m.PLOTS_ROUTES),
      },
      {
        path: 'alerts',
        data: { breadcrumb: 'nav.alerts' },
        loadComponent: () => import('./features/alerts/alerts-center').then((m) => m.AlertsCenter),
      },
      {
        path: 'devices',
        data: { roles: ['Farmer'], breadcrumb: 'nav.devices' },
        loadComponent: () => import('./features/devices/devices').then((m) => m.Devices),
      },
      {
        path: 'advisor',
        canActivateChild: [roleGuard],
        data: { roles: ['Advisor'] },
        loadChildren: () =>
          import('./features/advisor/advisor.routes').then((m) => m.ADVISOR_ROUTES),
      },
      {
        path: 'my-advisor',
        data: { roles: ['Farmer'], page: 'advisor', breadcrumb: 'nav.myAdvisor' },
        loadComponent: () => import('./features/account/account').then((m) => m.Account),
      },
      {
        path: 'subscription',
        data: { page: 'subscription', breadcrumb: 'nav.subscription' },
        loadComponent: () => import('./features/account/account').then((m) => m.Account),
      },
      {
        path: 'settings',
        data: { page: 'settings', breadcrumb: 'nav.settings' },
        loadComponent: () => import('./features/account/account').then((m) => m.Account),
      },
    ],
  },
  { path: '**', redirectTo: 'app/home' },
];
```

### C?mo se aplica la autorizaci?n

1. authGuard protege el layout /app y conserva la ruta interna de retorno al login.
2. roleGuard se ejecuta al navegar por las rutas hijas; compara data.roles y devuelve UrlTree para redirigir.
3. NAVIGATION filtra enlaces con los mismos roles. Ocultar enlaces no sustituye al guard.
4. MonitoringService limita lecturas, parcelas, dispositivos y mutaciones a las parcelas propias o asignadas.
5. Cualquier API real debe repetir la autorizaci?n en servidor; esta entrega implementa solamente el mock de frontend.

## 5. Flujos para revisar

- Entrar como Productor: dos parcelas, salinidad cualitativa y valores num?ricos plegados.
- Crear una finca y parcela: la nueva parcela aparece sin lecturas, sin inventar medidas.
- Abrir /app/advisor/reports con rol Productor: redirecci?n a Inicio.
- Reconocer una alerta, registrar una inspecci?n y resolverla: cambia el estado y el contador.
- Entrar como Asesor: cuatro parcelas, valores num?ricos y umbrales ECe con fuente.
- Comparar de 2 a 4 parcelas, alternar la m?trica y desplegar la tabla accesible.
- Seleccionar parcelas en Reportes y exportar el PDF con serie, variaci?n, alertas y acciones.
- Cambiar a ES: textos, formatos y atributo lang se actualizan; el idioma se recuerda al recargar.

## 6. L?mites y validaci?n

Consultar README.md para alcance del mock, calibraci?n de un punto, bandas de severidad de demostraci?n y revisi?n de accesibilidad pendiente. No se implementaron backend, correo real, facturaci?n ni integraci?n f?sica de sensores.

```powershell
npm run check:i18n
npm run format:check
npm test -- --watch=false
npm run build
```

import {
  ApiCorrectiveActionType,
  ApiError,
  FarmResource,
  PlotResource,
  RegisterCalibrationRecordResource,
  RegisterCorrectiveActionResource,
  RegisterFarmResource,
  RegisterPlotResource,
  SalinityAlertResource,
  SignUpResource,
  UserAccountResource,
} from '../api.types';
import { FakeAccount, FakeDatabase, localDate, localDateTime } from './fake-database';

export interface FakeRequest {
  method: string;
  /** Path below the API base URL, e.g. `/plots/3`. */
  path: string;
  params: URLSearchParams;
  body: unknown;
  authorization: string | null;
}
export interface FakeResponse {
  status: number;
  body: unknown;
}

class HttpFailure extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

type Handler = (request: FakeRequest, match: RegExpMatchArray) => FakeResponse;
const ok = (body: unknown): FakeResponse => ({ status: 200, body });
const created = (body: unknown): FakeResponse => ({ status: 201, body });
const CORRECTIVE_ACTIONS: ApiCorrectiveActionType[] = [
  'LEACHING',
  'DRAINAGE_IMPROVEMENT',
  'IRRIGATION_ADJUSTMENT',
  'SOIL_AMENDMENT',
  'CROP_ROTATION',
];
const TOKEN_PREFIX = 'fake-jwt.';

/**
 * In-browser implementation of the OsoSense `/api/v1` contract over {@link FakeDatabase}.
 * It answers with the Backend's status codes and resource shapes, and applies the access
 * rules the platform needs: farmers see their own farms, advisors see farms of farmers who
 * accepted their advisory link.
 */
export class FakeBackend {
  private readonly routes: [string, RegExp, Handler][] = [
    ['POST', /^\/auth\/signup$/, (request) => this.signUp(request)],
    ['POST', /^\/auth\/signin$/, (request) => this.signIn(request)],
    ['POST', /^\/auth\/password-reset-requests$/, (request) => this.requestReset(request)],
    ['POST', /^\/auth\/password-resets$/, (request) => this.resetPassword(request)],
    ['GET', /^\/users\/me$/, (request) => ok(this.publicAccount(this.caller(request)))],
    ['GET', /^\/users\/me\/linked-accounts$/, (request) => this.linkedAccounts(request)],
    ['POST', /^\/advisory-links$/, (request) => this.requestLink(request)],
    ['POST', /^\/advisory-links\/(\d+)\/(acceptance|revocation)$/, (r, m) => this.answerLink(r, m)],
    ['GET', /^\/subscription-plans$/, () => ok(this.db.plans)],
    ['GET', /^\/subscriptions\/mine$/, (request) => this.mySubscriptions(request)],
    ['GET', /^\/crops$/, () => ok(this.db.crops)],
    ['GET', /^\/farms\/mine$/, (request) => this.farmsOf(request, this.caller(request).id)],
    ['GET', /^\/farms$/, (request) => this.farmsOf(request, this.numberParam(request, 'ownerId'))],
    ['POST', /^\/farms$/, (request) => this.registerFarm(request)],
    ['PUT', /^\/farms\/(\d+)$/, (request, match) => this.updateFarm(request, +match[1])],
    ['GET', /^\/plots$/, (request) => this.plotsOf(request)],
    ['GET', /^\/plots\/(\d+)$/, (request, match) => ok(this.readablePlot(request, +match[1]))],
    ['POST', /^\/plots$/, (request) => this.registerPlot(request)],
    ['PUT', /^\/plots\/(\d+)$/, (request, match) => this.updatePlot(request, +match[1])],
    ['POST', /^\/plots\/(\d+)\/crop$/, (request, match) => this.assignCrop(request, +match[1])],
    ['GET', /^\/devices$/, (request) => this.devicesOf(request)],
    ['GET', /^\/soil-readings$/, (request) => this.readingsOf(request)],
    ['GET', /^\/calibration-records$/, (request) => this.calibrationsOf(request)],
    ['POST', /^\/calibration-records$/, (request) => this.registerCalibration(request)],
    ['GET', /^\/salinity-alerts$/, (request) => this.alertsOf(request)],
    ['GET', /^\/salinity-alerts\/(\d+)$/, (r, m) => ok(this.readableAlert(r, +m[1]))],
    ['POST', /^\/salinity-alerts\/(\d+)\/acknowledgement$/, (r, m) => this.acknowledge(r, +m[1])],
    ['GET', /^\/salinity-alerts\/(\d+)\/corrective-actions$/, (r, m) => this.actionsOf(r, +m[1])],
    [
      'POST',
      /^\/salinity-alerts\/(\d+)\/corrective-actions$/,
      (r, m) => this.registerAction(r, +m[1]),
    ],
  ];

  constructor(
    readonly db: FakeDatabase,
    private readonly clock: () => number = () => Date.now(),
  ) {}

  handle(request: FakeRequest): FakeResponse {
    try {
      for (const [method, pattern, handler] of this.routes) {
        const match = request.path.match(pattern);
        if (match && method === request.method) return handler(request, match);
      }
      throw new HttpFailure(404, `No fake API route for ${request.method} ${request.path}`);
    } catch (error) {
      if (!(error instanceof HttpFailure)) throw error;
      const body: ApiError = { message: error.message, fieldErrors: error.fieldErrors };
      return { status: error.status, body };
    }
  }

  // Identity and Access Management
  private signUp(request: FakeRequest): FakeResponse {
    const body = this.body<SignUpResource>(request);
    const email = this.email(body.email);
    const errors: Record<string, string> = {};
    if (!email) errors['email'] = 'must be a well-formed email address';
    if (!body.password || body.password.length < 8) errors['password'] = 'size must be at least 8';
    if (!body.firstName?.trim()) errors['firstName'] = 'must not be blank';
    if (!body.lastName?.trim()) errors['lastName'] = 'must not be blank';
    if (body.role !== 'FARMER' && body.role !== 'ADVISOR')
      errors['role'] = 'must be FARMER or ADVISOR';
    if (Object.keys(errors).length)
      throw new HttpFailure(400, 'The request has invalid fields', errors);
    const license = body.professionalLicenseNumber?.trim() || null;
    if (body.role === 'ADVISOR' && !license)
      throw new HttpFailure(400, 'An advisor account requires a professional license');
    if (body.role === 'FARMER' && license)
      throw new HttpFailure(400, 'A farmer account must not have a professional license');
    if (this.db.accounts.some((account) => account.email === email))
      throw new HttpFailure(409, 'An account with this email already exists');
    const account: FakeAccount = {
      id: this.db.nextId('accounts'),
      email,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      role: body.role,
      professionalLicenseNumber: license,
      active: true,
      createdAt: this.now(),
      department: body.department?.trim(),
      province: body.province?.trim(),
      password: body.password,
    };
    this.db.accounts.push(account);
    return created(this.publicAccount(account));
  }

  private signIn(request: FakeRequest): FakeResponse {
    const body = this.body<{ email: string; password: string }>(request);
    const account = this.db.accounts.find(
      (candidate) => candidate.email === this.email(body.email),
    );
    if (!account || account.password !== body.password)
      throw new HttpFailure(401, 'Invalid email or password');
    const token = `${TOKEN_PREFIX}${account.id}.${Math.random().toString(36).slice(2)}`;
    const expiresAt = new Date(this.clock() + 3_600_000).toISOString();
    return ok({ token, expiresAt, user: this.publicAccount(account) });
  }

  /** Always 202, so the response never reveals whether an email is registered. */
  private requestReset(request: FakeRequest): FakeResponse {
    const email = this.email(this.body<{ email: string }>(request).email);
    const account = this.db.accounts.find((candidate) => candidate.email === email);
    if (!account) return { status: 202, body: {} };
    this.db.resetTokens = this.db.resetTokens.filter((entry) => entry.email !== email);
    const token = crypto.randomUUID();
    this.db.resetTokens.push({ token, email, expiresAt: this.clock() + 15 * 60_000 });
    return { status: 202, body: { demoResetToken: token } };
  }

  private resetPassword(request: FakeRequest): FakeResponse {
    const body = this.body<{ token: string; newPassword: string }>(request);
    const entry = this.db.resetTokens.find((candidate) => candidate.token === body.token);
    if (!entry || entry.expiresAt <= this.clock())
      throw new HttpFailure(400, 'The reset token is invalid or has expired');
    if (!body.newPassword || body.newPassword.length < 8)
      throw new HttpFailure(400, 'The request has invalid fields', {
        newPassword: 'size must be at least 8',
      });
    const account = this.db.accounts.find((candidate) => candidate.email === entry.email)!;
    account.password = body.newPassword;
    this.db.resetTokens = this.db.resetTokens.filter((candidate) => candidate !== entry);
    return { status: 204, body: null };
  }

  private linkedAccounts(request: FakeRequest): FakeResponse {
    const caller = this.caller(request);
    const ids = this.db.advisoryLinks
      .filter((link) => link.status === 'ACCEPTED')
      .filter((link) => (caller.role === 'ADVISOR' ? link.advisorId : link.farmerId) === caller.id)
      .map((link) => (caller.role === 'ADVISOR' ? link.farmerId : link.advisorId));
    return ok(
      this.db.accounts
        .filter((account) => ids.includes(account.id))
        .map((account) => this.publicAccount(account)),
    );
  }

  private requestLink(request: FakeRequest): FakeResponse {
    const caller = this.caller(request);
    if (caller.role !== 'ADVISOR') throw new HttpFailure(403, 'Only advisors request links');
    const farmerId = Number(this.body<{ farmerId: number }>(request).farmerId);
    if (!this.db.accounts.some((account) => account.id === farmerId && account.role === 'FARMER'))
      throw new HttpFailure(404, `Farmer not found for id ${farmerId}`);
    if (
      this.db.advisoryLinks.some(
        (link) =>
          link.advisorId === caller.id && link.farmerId === farmerId && link.status !== 'REVOKED',
      )
    )
      throw new HttpFailure(409, 'An advisory link with this farmer already exists');
    const link = {
      id: this.db.nextId('advisoryLinks'),
      advisorId: caller.id,
      farmerId,
      status: 'PENDING' as const,
      requestedAt: this.now(),
      respondedAt: null,
    };
    this.db.advisoryLinks.push(link);
    return created(link);
  }

  private answerLink(request: FakeRequest, match: RegExpMatchArray): FakeResponse {
    const caller = this.caller(request);
    const link = this.db.advisoryLinks.find((candidate) => candidate.id === +match[1]);
    if (!link) throw new HttpFailure(404, `Advisory link not found for id ${match[1]}`);
    if (match[2] === 'acceptance') {
      if (link.farmerId !== caller.id) throw new HttpFailure(403, 'Only the farmer can accept');
      if (link.status !== 'PENDING')
        throw new HttpFailure(409, 'Only a pending link can be accepted');
      link.status = 'ACCEPTED';
    } else {
      if (link.farmerId !== caller.id && link.advisorId !== caller.id)
        throw new HttpFailure(403, 'Only a party of the link can revoke it');
      link.status = 'REVOKED';
    }
    link.respondedAt = this.now();
    return ok(link);
  }

  // Subscription and Billing
  private mySubscriptions(request: FakeRequest): FakeResponse {
    const caller = this.caller(request);
    return ok(this.db.subscriptions.filter((item) => item.userAccountId === caller.id));
  }

  // Farm Management
  private farmsOf(request: FakeRequest, ownerId: number): FakeResponse {
    const caller = this.caller(request);
    if (!this.canRead(caller, ownerId))
      throw new HttpFailure(403, `No active advisory link with farmer ${ownerId}`);
    return ok(this.db.farms.filter((farm) => farm.ownerId === ownerId));
  }

  private registerFarm(request: FakeRequest): FakeResponse {
    const caller = this.caller(request);
    if (caller.role !== 'FARMER') throw new HttpFailure(403, 'Only farmers register farms');
    const body = this.farmBody(request);
    const farm: FarmResource = {
      id: this.db.nextId('farms'),
      ownerId: caller.id,
      ...body,
      createdAt: this.now(),
    };
    this.db.farms.push(farm);
    return created(farm);
  }

  private updateFarm(request: FakeRequest, id: number): FakeResponse {
    const farm = this.ownedFarm(request, id);
    Object.assign(farm, this.farmBody(request));
    return ok(farm);
  }

  private plotsOf(request: FakeRequest): FakeResponse {
    const farmId = this.numberParam(request, 'farmId');
    this.readableFarm(request, farmId);
    return ok(this.db.plots.filter((plot) => plot.farmId === farmId));
  }

  private registerPlot(request: FakeRequest): FakeResponse {
    const body = this.body<RegisterPlotResource>(request);
    this.ownedFarm(request, Number(body.farmId));
    const plot: PlotResource = {
      id: this.db.nextId('plots'),
      farmId: Number(body.farmId),
      cropId: null,
      ...this.plotDetails(body),
      active: true,
      createdAt: this.now(),
    };
    this.db.plots.push(plot);
    return created(plot);
  }

  private updatePlot(request: FakeRequest, id: number): FakeResponse {
    const plot = this.ownedPlot(request, id);
    Object.assign(plot, this.plotDetails(this.body<RegisterPlotResource>(request)));
    return ok(plot);
  }

  private assignCrop(request: FakeRequest, id: number): FakeResponse {
    const plot = this.ownedPlot(request, id);
    const cropId = Number(this.body<{ cropId: number }>(request).cropId);
    if (!this.db.crops.some((crop) => crop.id === cropId))
      throw new HttpFailure(404, `Crop not found for id ${cropId}`);
    plot.cropId = cropId;
    return ok(plot);
  }

  private devicesOf(request: FakeRequest): FakeResponse {
    const plot = this.readablePlot(request, this.numberParam(request, 'plotId'));
    return ok(this.db.devices.filter((device) => device.plotId === plot.id));
  }

  // Soil Monitoring
  private readingsOf(request: FakeRequest): FakeResponse {
    const plot = this.readablePlot(request, this.numberParam(request, 'plotId'));
    return ok(this.db.readings.filter((reading) => reading.plotId === plot.id));
  }

  private calibrationsOf(request: FakeRequest): FakeResponse {
    const device = this.readableDevice(request, this.numberParam(request, 'deviceId'));
    return ok(this.db.calibrations.filter((record) => record.deviceId === device.id));
  }

  private registerCalibration(request: FakeRequest): FakeResponse {
    const caller = this.caller(request);
    if (caller.role !== 'ADVISOR') throw new HttpFailure(403, 'Only advisors record calibrations');
    const body = this.body<RegisterCalibrationRecordResource>(request);
    const device = this.readableDevice(request, Number(body.deviceId));
    const lab = Number(body.labConductivityDsM);
    const sensor = Number(body.deviceReadingAtSampling);
    if (!(lab >= 0) || !(sensor > 0) || !body.laboratoryName?.trim() || !body.samplingDate)
      throw new HttpFailure(400, 'The request has invalid fields');
    const record = {
      id: this.db.nextId('calibrations'),
      deviceId: device.id,
      labConductivityDsM: lab,
      samplingDate: body.samplingDate,
      laboratoryName: body.laboratoryName.trim(),
      deviceReadingAtSampling: sensor,
      resultingFactor: +(lab / sensor).toFixed(4),
      registeredAt: this.now(),
    };
    this.db.calibrations.push(record);
    return created(record);
  }

  // Salinity Alerting
  private alertsOf(request: FakeRequest): FakeResponse {
    const plot = this.readablePlot(request, this.numberParam(request, 'plotId'));
    return ok(this.db.alerts.filter((alert) => alert.plotId === plot.id));
  }

  private acknowledge(request: FakeRequest, id: number): FakeResponse {
    const alert = this.readableAlert(request, id);
    if (alert.status !== 'OPEN')
      throw new HttpFailure(409, 'Only an open alert can be acknowledged');
    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedBy = this.caller(request).id;
    alert.acknowledgedAt = this.now();
    return ok(alert);
  }

  private actionsOf(request: FakeRequest, id: number): FakeResponse {
    const alert = this.readableAlert(request, id);
    return ok(this.db.correctiveActions.filter((action) => action.salinityAlertId === alert.id));
  }

  /** Registering the corrective action resolves the alert, as in the Backend. */
  private registerAction(request: FakeRequest, id: number): FakeResponse {
    const alert = this.readableAlert(request, id);
    if (alert.status === 'RESOLVED') throw new HttpFailure(409, 'The alert is already resolved');
    const body = this.body<RegisterCorrectiveActionResource>(request);
    const errors: Record<string, string> = {};
    if (!CORRECTIVE_ACTIONS.includes(body.actionType)) errors['actionType'] = 'is not supported';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.executedAt ?? '') || body.executedAt > this.today())
      errors['executedAt'] = 'must be a past or present date';
    if ((body.notes ?? '').length > 2000) errors['notes'] = 'size must be at most 2000';
    if (Object.keys(errors).length)
      throw new HttpFailure(400, 'The request has invalid fields', errors);
    const action = {
      id: this.db.nextId('correctiveActions'),
      salinityAlertId: alert.id,
      actionType: body.actionType,
      executedAt: body.executedAt,
      notes: body.notes?.trim() || null,
      registeredBy: this.caller(request).id,
      registeredAt: this.now(),
    };
    this.db.correctiveActions.push(action);
    alert.status = 'RESOLVED';
    return created(action);
  }

  // Access rules
  private caller(request: FakeRequest): FakeAccount {
    const token = request.authorization?.replace(/^Bearer /, '') ?? '';
    const id = token.startsWith(TOKEN_PREFIX) ? Number(token.split('.')[1]) : NaN;
    const account = this.db.accounts.find((candidate) => candidate.id === id);
    if (!account) throw new HttpFailure(401, 'Authentication is required');
    return account;
  }

  private canRead(caller: FakeAccount, ownerId: number): boolean {
    return (
      caller.id === ownerId ||
      (caller.role === 'ADVISOR' &&
        this.db.advisoryLinks.some(
          (link) =>
            link.advisorId === caller.id && link.farmerId === ownerId && link.status === 'ACCEPTED',
        ))
    );
  }

  private readableFarm(request: FakeRequest, id: number): FarmResource {
    const farm = this.db.farms.find((candidate) => candidate.id === id);
    if (!farm || !this.canRead(this.caller(request), farm.ownerId))
      throw new HttpFailure(404, `Farm not found for id ${id}`);
    return farm;
  }

  private ownedFarm(request: FakeRequest, id: number): FarmResource {
    const farm = this.readableFarm(request, id);
    if (farm.ownerId !== this.caller(request).id)
      throw new HttpFailure(403, `Only the owner can change farm ${id}`);
    return farm;
  }

  private readablePlot(request: FakeRequest, id: number): PlotResource {
    const plot = this.db.plots.find((candidate) => candidate.id === id);
    if (!plot) throw new HttpFailure(404, `Plot not found for id ${id}`);
    this.readableFarm(request, plot.farmId);
    return plot;
  }

  private ownedPlot(request: FakeRequest, id: number): PlotResource {
    const plot = this.readablePlot(request, id);
    this.ownedFarm(request, plot.farmId);
    return plot;
  }

  private readableDevice(request: FakeRequest, id: number) {
    const device = this.db.devices.find((candidate) => candidate.id === id);
    if (!device?.plotId) throw new HttpFailure(404, `Device not found for id ${id}`);
    this.readablePlot(request, device.plotId);
    return device;
  }

  private readableAlert(request: FakeRequest, id: number): SalinityAlertResource {
    const alert = this.db.alerts.find((candidate) => candidate.id === id);
    if (!alert) throw new HttpFailure(404, `Salinity alert not found for id ${id}`);
    this.readablePlot(request, alert.plotId);
    return alert;
  }

  // Request helpers
  private body<T>(request: FakeRequest): T {
    if (!request.body || typeof request.body !== 'object')
      throw new HttpFailure(400, 'A JSON body is required');
    return request.body as T;
  }

  private numberParam(request: FakeRequest, name: string): number {
    const value = Number(request.params.get(name));
    if (!Number.isInteger(value) || value <= 0)
      throw new HttpFailure(400, `Required parameter '${name}' is missing or invalid`);
    return value;
  }

  private farmBody(request: FakeRequest): RegisterFarmResource {
    const body = this.body<RegisterFarmResource>(request);
    const errors: Record<string, string> = {};
    for (const field of ['name', 'department', 'province', 'district'] as const)
      if (!body[field]?.trim()) errors[field] = 'must not be blank';
    if (Object.keys(errors).length)
      throw new HttpFailure(400, 'The request has invalid fields', errors);
    return {
      name: body.name.trim(),
      department: body.department.trim(),
      province: body.province.trim(),
      district: body.district.trim(),
    };
  }

  private plotDetails(body: Omit<RegisterPlotResource, 'farmId'>) {
    const errors: Record<string, string> = {};
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const areaHectares = Number(body.areaHectares);
    if (!body.name?.trim()) errors['name'] = 'must not be blank';
    if (!(areaHectares > 0)) errors['areaHectares'] = 'must be greater than 0.0';
    if (!(Math.abs(latitude) <= 90)) errors['latitude'] = 'must be between -90 and 90';
    if (!(Math.abs(longitude) <= 180)) errors['longitude'] = 'must be between -180 and 180';
    if (Object.keys(errors).length)
      throw new HttpFailure(400, 'The request has invalid fields', errors);
    return { name: body.name.trim(), areaHectares, latitude, longitude };
  }

  private email(value: unknown): string {
    const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
  }

  private publicAccount(account: FakeAccount): UserAccountResource {
    const { password: _password, ...resource } = account;
    return resource;
  }

  private now(): string {
    return localDateTime(new Date(this.clock()));
  }

  private today(): string {
    return localDate(new Date(this.clock()));
  }
}

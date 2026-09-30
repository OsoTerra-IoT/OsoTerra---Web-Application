/**
 * Resources of the OsoSense RESTful API (`/api/v1`), mirrored field by field from the
 * Backend's `interfaces/rest/resources` records. Ids are numbers and date-times are ISO
 * local date-times without offset, exactly as the Backend serializes them.
 */

export type ApiRole = 'FARMER' | 'ADVISOR';

export interface ApiError {
  message: string;
  fieldErrors: Record<string, string>;
}

// Identity and Access Management
export interface UserAccountResource {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: ApiRole;
  professionalLicenseNumber: string | null;
  active: boolean;
  createdAt: string;
  /** Sent at sign-up by the Web App; the Backend does not store it yet. */
  department?: string;
  /** Sent at sign-up by the Web App; the Backend does not store it yet. */
  province?: string;
}
export interface SignUpResource {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: ApiRole;
  professionalLicenseNumber: string | null;
  department?: string;
  province?: string;
}
export interface SignInResource {
  email: string;
  password: string;
}
export interface AuthenticatedUserResource {
  token: string;
  expiresAt: string;
  user: UserAccountResource;
}
export interface RequestPasswordResetResource {
  email: string;
}
/** 202 Accepted. Only the fake API returns the token, because it has no mailbox to send it to. */
export interface PasswordResetAcceptedResource {
  demoResetToken?: string;
}
export interface ResetPasswordResource {
  token: string;
  newPassword: string;
}
export interface AdvisoryLinkResource {
  id: number;
  advisorId: number;
  farmerId: number;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED';
  requestedAt: string;
  respondedAt: string | null;
}

// Subscription and Billing
export interface SubscriptionPlanResource {
  id: number;
  name: string;
  priceAmount: number;
  priceCurrency: string;
  billingCycle: 'MONTHLY' | 'ANNUAL' | 'NONE';
  maxPlots: number;
  free: boolean;
  active: boolean;
}
export interface SubscriptionResource {
  id: number;
  userAccountId: number;
  subscriptionPlanId: number;
  status: 'ACTIVE' | 'PENDING_PAYMENT' | 'SUSPENDED' | 'CANCELLED';
  quotaTotal: number;
  quotaConsumed: number;
  periodStartDate: string;
  periodEndDate: string | null;
  createdAt: string;
}

// Farm Management
export interface CropResource {
  id: number;
  commonName: string;
  scientificName: string | null;
  salinityThresholdDsM: number;
  saltToleranceClass: string;
  sourceReference: string | null;
}
export interface FarmResource {
  id: number;
  ownerId: number;
  name: string;
  department: string;
  province: string;
  district: string;
  createdAt: string;
}
export interface RegisterFarmResource {
  name: string;
  department: string;
  province: string;
  district: string;
}
export interface PlotResource {
  id: number;
  farmId: number;
  cropId: number | null;
  name: string;
  areaHectares: number;
  latitude: number;
  longitude: number;
  active: boolean;
  createdAt: string;
}
export interface RegisterPlotResource {
  farmId: number;
  name: string;
  areaHectares: number;
  latitude: number;
  longitude: number;
}
export type UpdatePlotResource = Omit<RegisterPlotResource, 'farmId'>;
export type DeviceStatus = 'UNASSIGNED' | 'ACTIVE' | 'OFFLINE' | 'INACTIVE';
export interface DeviceResource {
  id: number;
  plotId: number | null;
  activationCode: string;
  status: DeviceStatus;
  calibrationFactor: number;
  batteryLevel: number | null;
  firmwareVersion: string | null;
  readingIntervalMinutes: number;
  lastSeenAt: string | null;
  createdAt: string;
}

// Soil Monitoring
export interface SoilReadingResource {
  id: number;
  deviceId: number;
  plotId: number;
  readingBatchId: number;
  rawConductivityDsM: number;
  compensatedConductivityDsM: number;
  compensationFactor: number;
  moisturePercentage: number;
  temperatureCelsius: number;
  capturedAt: string;
  storedAt: string;
}
export interface CalibrationRecordResource {
  id: number;
  deviceId: number;
  labConductivityDsM: number;
  samplingDate: string;
  laboratoryName: string;
  deviceReadingAtSampling: number;
  resultingFactor: number;
  registeredAt: string;
}
export interface RegisterCalibrationRecordResource {
  deviceId: number;
  labConductivityDsM: number;
  samplingDate: string;
  laboratoryName: string;
  deviceReadingAtSampling: number;
}

// Salinity Alerting
export type ApiAlertSeverity = 'WATCH' | 'WARNING' | 'CRITICAL';
export type ApiAlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
export type ApiCorrectiveActionType =
  | 'LEACHING'
  | 'DRAINAGE_IMPROVEMENT'
  | 'IRRIGATION_ADJUSTMENT'
  | 'SOIL_AMENDMENT'
  | 'CROP_ROTATION';
export interface SalinityAlertResource {
  id: number;
  plotId: number;
  soilReadingId: number;
  observedConductivityDsM: number;
  appliedThresholdDsM: number;
  excessRatio: number;
  severity: ApiAlertSeverity;
  status: ApiAlertStatus;
  acknowledgedBy: number | null;
  acknowledgedAt: string | null;
  generatedAt: string;
}
export interface CorrectiveActionResource {
  id: number;
  salinityAlertId: number;
  actionType: ApiCorrectiveActionType;
  executedAt: string;
  notes: string | null;
  registeredBy: number;
  registeredAt: string;
}
export interface RegisterCorrectiveActionResource {
  actionType: ApiCorrectiveActionType;
  executedAt: string;
  notes: string;
}
export interface NotificationPreferenceResource {
  id: number;
  userAccountId: number;
  minimumSeverity: ApiAlertSeverity;
  channel: 'PUSH' | 'EMAIL' | 'BOTH';
  pushDeviceToken: string | null;
  preferredLanguage: string | null;
}

// Analytics and Reporting
export interface AlertSummaryResource {
  severity: ApiAlertSeverity;
  status: ApiAlertStatus;
  generatedAt: string;
}
export interface PlotDashboardResource {
  plotId: number;
  plotName: string;
  areaHectares: number;
  cropName: string | null;
  recentAlerts: AlertSummaryResource[];
}

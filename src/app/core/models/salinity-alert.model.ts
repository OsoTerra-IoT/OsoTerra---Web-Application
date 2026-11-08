export type AlertSeverity = 'WATCH' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
export type CorrectiveActionType =
  | 'LEACHING'
  | 'DRAINAGE_IMPROVEMENT'
  | 'IRRIGATION_ADJUSTMENT'
  | 'SOIL_AMENDMENT'
  | 'CROP_ROTATION';
export const CORRECTIVE_ACTION_TYPES: readonly CorrectiveActionType[] = [
  'LEACHING',
  'IRRIGATION_ADJUSTMENT',
  'DRAINAGE_IMPROVEMENT',
  'SOIL_AMENDMENT',
  'CROP_ROTATION',
];

export interface CorrectiveAction {
  id: string;
  type: CorrectiveActionType;
  /** Calendar date the action was carried out (YYYY-MM-DD). */
  performedAt: string;
  notes: string;
  createdBy: string;
  /** True when the sensor carried it out on its own (e.g. the pump wash), not a person. */
  automatic?: boolean;
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

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

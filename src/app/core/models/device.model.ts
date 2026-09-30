export interface Device {
  id: string;
  plotId: string;
  serialNumber: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  /** Null until the device reports it. */
  batteryPercent: number | null;
  /** Radio signal strength; the Backend does not report it yet. */
  signalDbm?: number;
  lastSeenAt: string | null;
  firmwareVersion: string | null;
  /** Latest single-point calibration against a laboratory ECe sample. */
  calibration?: {
    sensorDsM: number;
    laboratoryEceDsM: number;
    offsetDsM: number;
    calibratedAt: string;
    laboratory: string;
  };
}

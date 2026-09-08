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

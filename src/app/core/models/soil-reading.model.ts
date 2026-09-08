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

import { Crop, Device, Farm, Plot, SalinityAlert, SoilReading } from '../models';

const reference = {
  authors: 'Maas & Hoffman',
  year: 1977,
  title: 'Crop salt tolerance — current assessment',
  url: 'https://www.ars.usda.gov/arsuserfiles/20360500/pdf_pubs/P572.pdf',
};
export const CROPS: Crop[] = [
  {
    id: 'corn',
    nameKey: 'crops.corn',
    scientificName: 'Zea mays',
    salinityThresholdDsM: 1.7,
    yieldLossPercentPerDsM: 12,
    measurementBasis: 'ECe',
    reference,
  },
  {
    id: 'tomato',
    nameKey: 'crops.tomato',
    scientificName: 'Solanum lycopersicum',
    salinityThresholdDsM: 2.5,
    yieldLossPercentPerDsM: 9.9,
    measurementBasis: 'ECe',
    reference,
  },
  {
    id: 'wheat',
    nameKey: 'crops.wheat',
    scientificName: 'Triticum aestivum',
    salinityThresholdDsM: 6,
    yieldLossPercentPerDsM: 7.1,
    measurementBasis: 'ECe',
    reference,
  },
];
export const FARMS: Farm[] = [
  { id: 'farm-1', name: 'Santa Rosa', ownerId: 'farmer-1', department: 'Lima', province: 'Huaral' },
  { id: 'farm-2', name: 'Los Olivos', ownerId: 'farmer-2', department: 'Lima', province: 'Huaura' },
];
export const PLOTS: Plot[] = [
  {
    id: 'plot-1',
    farmId: 'farm-1',
    ownerId: 'farmer-1',
    advisorIds: ['advisor-1'],
    name: 'Sector Norte',
    latitude: -11.49,
    longitude: -77.21,
    areaHectares: 4.2,
    cropId: 'corn',
    deviceId: 'device-1',
    createdAt: '2026-09-01T12:00:00Z',
  },
  {
    id: 'plot-2',
    farmId: 'farm-1',
    ownerId: 'farmer-1',
    advisorIds: ['advisor-1'],
    name: 'La Quebrada',
    latitude: -11.5,
    longitude: -77.2,
    areaHectares: 2.8,
    cropId: 'tomato',
    deviceId: 'device-2',
    createdAt: '2026-09-01T12:00:00Z',
  },
  {
    id: 'plot-3',
    farmId: 'farm-2',
    ownerId: 'farmer-2',
    advisorIds: ['advisor-1'],
    name: 'Campo Este',
    latitude: -11.07,
    longitude: -77.59,
    areaHectares: 6.5,
    cropId: 'wheat',
    deviceId: 'device-3',
    createdAt: '2026-09-01T12:00:00Z',
  },
  {
    id: 'plot-4',
    farmId: 'farm-2',
    ownerId: 'farmer-2',
    advisorIds: ['advisor-1'],
    name: 'El Mirador',
    latitude: -11.08,
    longitude: -77.58,
    areaHectares: 3.1,
    cropId: 'corn',
    deviceId: 'device-4',
    createdAt: '2026-09-01T12:00:00Z',
  },
];
const now = Date.now();
export const DEVICES: Device[] = PLOTS.map((plot, index) => ({
  id: plot.deviceId!,
  plotId: plot.id,
  serialNumber: `OT-240${index + 1}`,
  status: index === 3 ? 'OFFLINE' : 'ONLINE',
  batteryPercent: [87, 64, 92, 18][index],
  signalDbm: -65 - index * 7,
  lastSeenAt: new Date(now - (index === 3 ? 7_200_000 : 300_000)).toISOString(),
  firmwareVersion: '1.4.2',
}));
export const READINGS: SoilReading[] = PLOTS.flatMap((plot, index) =>
  Array.from({ length: 14 }, (_, day) => ({
    id: `${plot.id}-reading-${day}`,
    plotId: plot.id,
    deviceId: plot.deviceId!,
    recordedAt: new Date(now - (13 - day) * 86_400_000 - 300_000).toISOString(),
    conductivityDsM: +(
      [2.4, 1.5, 5.1, 1.8][index] +
      (day - 13) * 0.02 +
      Math.sin(day) * 0.04
    ).toFixed(2),
    measurementBasis: 'ECe' as const,
    moisturePercent: +(34 + index * 2 + Math.cos(day) * 4).toFixed(1),
    temperatureCelsius: +(23 + index + Math.sin(day) * 2).toFixed(1),
    quality: 'VALID' as const,
  })),
);
export const ALERTS: SalinityAlert[] = [
  {
    id: 'alert-1',
    plotId: 'plot-1',
    readingId: 'plot-1-reading-13',
    severity: 'CRITICAL',
    status: 'OPEN',
    conductivityDsM: 2.42,
    thresholdDsM: 1.7,
    createdAt: new Date(now - 3_600_000).toISOString(),
    actions: [],
  },
  {
    id: 'alert-2',
    plotId: 'plot-4',
    readingId: 'plot-4-reading-13',
    severity: 'WARNING',
    status: 'OPEN',
    conductivityDsM: 1.82,
    thresholdDsM: 1.7,
    createdAt: new Date(now - 7_200_000).toISOString(),
    actions: [],
  },
  {
    id: 'alert-3',
    plotId: 'plot-3',
    readingId: 'plot-3-reading-13',
    severity: 'WATCH',
    status: 'ACKNOWLEDGED',
    conductivityDsM: 5.12,
    thresholdDsM: 6,
    createdAt: new Date(now - 86_400_000).toISOString(),
    acknowledgedAt: new Date(now - 43_200_000).toISOString(),
    actions: [],
  },
];

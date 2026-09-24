import { Crop, Device, Farm, Plot, SalinityAlert, SoilReading } from '../models';

const maasHoffman = {
  authors: 'Maas & Hoffman',
  year: 1977,
  title: 'Crop salt tolerance — current assessment',
  url: 'https://www.ars.usda.gov/arsuserfiles/20360500/pdf_pubs/P572.pdf',
};
/**
 * Demo crops of the north-coast segment. Only table grape has a Maas & Hoffman threshold and slope.
 * Avocado and blueberry are rated salt-sensitive without a published ECe slope, so their thresholds
 * are reference values and no yield-loss slope is given.
 */
export const CROPS: Crop[] = [
  {
    id: 'avocado',
    nameKey: 'crops.avocado',
    scientificName: 'Persea americana',
    // ECw 0.75 dS/m water-quality threshold converted with ECe ≈ 1.5 × ECw (FAO Paper 29).
    salinityThresholdDsM: 1.1,
    yieldLossPercentPerDsM: null,
    measurementBasis: 'ECe',
    reference: {
      authors: 'Acosta-Rangel et al.',
      year: 2019,
      title: "The physiological response of 'Hass' avocado to salinity as influenced by rootstock",
      url: 'https://www.ars.usda.gov/arsuserfiles/20361500/pdf_pubs/P2665.pdf',
    },
  },
  {
    id: 'table-grape',
    nameKey: 'crops.tableGrape',
    scientificName: 'Vitis vinifera',
    salinityThresholdDsM: 1.5,
    yieldLossPercentPerDsM: 9.6,
    measurementBasis: 'ECe',
    reference: maasHoffman,
  },
  {
    id: 'blueberry',
    nameKey: 'crops.blueberry',
    scientificName: 'Vaccinium corymbosum',
    salinityThresholdDsM: 1.5,
    yieldLossPercentPerDsM: null,
    measurementBasis: 'ECe',
    reference: {
      authors: 'Machado, Bryla & Vargas',
      year: 2014,
      title:
        'Effects of salinity induced by ammonium sulfate fertilizer on root and shoot growth of highbush blueberry',
      url: 'https://ishs.org/ishs-article/1017_49/',
    },
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
    cropId: 'avocado',
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
    cropId: 'table-grape',
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
    cropId: 'blueberry',
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
    cropId: 'table-grape',
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
      [1.6, 0.9, 1.27, 1.6][index] +
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
    conductivityDsM: 1.62,
    thresholdDsM: 1.1,
    createdAt: new Date(now - 3_600_000).toISOString(),
    actions: [],
  },
  {
    id: 'alert-2',
    plotId: 'plot-4',
    readingId: 'plot-4-reading-13',
    severity: 'WARNING',
    status: 'OPEN',
    conductivityDsM: 1.62,
    thresholdDsM: 1.5,
    createdAt: new Date(now - 7_200_000).toISOString(),
    actions: [],
  },
  {
    id: 'alert-3',
    plotId: 'plot-3',
    readingId: 'plot-3-reading-13',
    severity: 'WATCH',
    status: 'ACKNOWLEDGED',
    conductivityDsM: 1.29,
    thresholdDsM: 1.5,
    createdAt: new Date(now - 86_400_000).toISOString(),
    acknowledgedAt: new Date(now - 43_200_000).toISOString(),
    actions: [],
  },
];

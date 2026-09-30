import {
  CorrectiveAction,
  Crop,
  CropReference,
  Device,
  Farm,
  Plot,
  SalinityAlert,
  SoilReading,
  User,
} from '../models';
import {
  CalibrationRecordResource,
  CorrectiveActionResource,
  CropResource,
  DeviceResource,
  FarmResource,
  PlotResource,
  SalinityAlertResource,
  SoilReadingResource,
  UserAccountResource,
} from './api.types';

/** Maps the API's numeric ids to the string ids the views and routes use. */
export const toId = (id: number): string => String(id);
export const fromId = (id: string): number => Number(id);

export const MAAS_HOFFMAN: CropReference = {
  authors: 'Maas & Hoffman',
  year: 1977,
  title: 'Crop salt tolerance — current assessment',
  url: 'https://www.ars.usda.gov/arsuserfiles/20360500/pdf_pubs/P572.pdf',
};

interface CropKnowledge {
  nameKey: string;
  scientificName: string;
  yieldLossPercentPerDsM: number | null;
  reference: CropReference;
}
/**
 * Agronomic reference data the Web App shows next to the Backend's crop catalog, keyed by
 * the catalog's common name. Slopes are the Maas & Hoffman ECe values (FAO Paper 29);
 * avocado and blueberry have no published slope.
 */
const CROP_KNOWLEDGE: Record<string, CropKnowledge> = {
  Cebada: known('barley', 'Hordeum vulgare', 5.0),
  Algodón: known('cotton', 'Gossypium hirsutum', 5.2),
  'Remolacha azucarera': known('sugarBeet', 'Beta vulgaris', 5.9),
  Trigo: known('wheat', 'Triticum aestivum', 7.1),
  Espárrago: known('asparagus', 'Asparagus officinalis', 2.0),
  Arroz: known('rice', 'Oryza sativa', 12),
  Tomate: known('tomato', 'Solanum lycopersicum', 9.9),
  Maíz: known('corn', 'Zea mays', 12),
  Papa: known('potato', 'Solanum tuberosum', 12),
  Uva: known('tableGrape', 'Vitis vinifera', 9.6),
  Cebolla: known('onion', 'Allium cepa', 16),
  Fresa: known('strawberry', 'Fragaria × ananassa', 33),
  // ECw 0.75 dS/m water-quality threshold converted with ECe ≈ 1.5 × ECw (FAO Paper 29).
  Palta: {
    nameKey: 'crops.avocado',
    scientificName: 'Persea americana',
    yieldLossPercentPerDsM: null,
    reference: {
      authors: 'Acosta-Rangel et al.',
      year: 2019,
      title: "The physiological response of 'Hass' avocado to salinity as influenced by rootstock",
      url: 'https://www.ars.usda.gov/arsuserfiles/20361500/pdf_pubs/P2665.pdf',
    },
  },
  Arándano: {
    nameKey: 'crops.blueberry',
    scientificName: 'Vaccinium corymbosum',
    yieldLossPercentPerDsM: null,
    reference: {
      authors: 'Machado, Bryla & Vargas',
      year: 2014,
      title:
        'Effects of salinity induced by ammonium sulfate fertilizer on root and shoot growth of highbush blueberry',
      url: 'https://ishs.org/ishs-article/1017_49/',
    },
  },
};
function known(key: string, scientificName: string, slope: number): CropKnowledge {
  return {
    nameKey: 'crops.' + key,
    scientificName,
    yieldLossPercentPerDsM: slope,
    reference: MAAS_HOFFMAN,
  };
}

export function toCrop(resource: CropResource): Crop {
  const knowledge = CROP_KNOWLEDGE[resource.commonName];
  return {
    id: toId(resource.id),
    // An unknown crop shows its catalog name: the translate pipe echoes missing keys.
    nameKey: knowledge?.nameKey ?? resource.commonName,
    scientificName: resource.scientificName ?? knowledge?.scientificName ?? '',
    salinityThresholdDsM: resource.salinityThresholdDsM,
    yieldLossPercentPerDsM: knowledge?.yieldLossPercentPerDsM ?? null,
    measurementBasis: 'ECe',
    reference: knowledge?.reference ?? MAAS_HOFFMAN,
  };
}

export function toUser(resource: UserAccountResource, advisorId?: string): User {
  const common = {
    id: toId(resource.id),
    firstName: resource.firstName,
    lastName: resource.lastName,
    email: resource.email,
    department: resource.department ?? '',
    province: resource.province ?? '',
    locale: 'en_US' as const,
    termsAcceptedAt: resource.createdAt,
  };
  return resource.role === 'ADVISOR'
    ? { ...common, role: 'Advisor', cipNumber: resource.professionalLicenseNumber ?? '' }
    : { ...common, role: 'Farmer', advisorId };
}

export function toFarm(resource: FarmResource): Farm {
  return {
    id: toId(resource.id),
    name: resource.name,
    ownerId: toId(resource.ownerId),
    department: resource.department,
    province: resource.province,
    district: resource.district,
  };
}

/** A plot's owner is its farm's owner; the Backend does not repeat it on the plot. */
export function toPlot(
  resource: PlotResource,
  ownerId: string,
  advisorIds: string[],
  device?: DeviceResource,
): Plot {
  return {
    id: toId(resource.id),
    farmId: toId(resource.farmId),
    ownerId,
    advisorIds,
    name: resource.name,
    latitude: resource.latitude,
    longitude: resource.longitude,
    areaHectares: resource.areaHectares,
    cropId: resource.cropId === null ? '' : toId(resource.cropId),
    deviceId: device ? toId(device.id) : undefined,
    createdAt: resource.createdAt,
  };
}

const DEVICE_STATUS: Record<DeviceResource['status'], Device['status']> = {
  ACTIVE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  UNASSIGNED: 'MAINTENANCE',
  INACTIVE: 'MAINTENANCE',
};

export function toDevice(
  resource: DeviceResource,
  calibration?: CalibrationRecordResource,
): Device {
  return {
    id: toId(resource.id),
    plotId: resource.plotId === null ? '' : toId(resource.plotId),
    serialNumber: resource.activationCode,
    status: DEVICE_STATUS[resource.status],
    batteryPercent: resource.batteryLevel,
    lastSeenAt: resource.lastSeenAt,
    firmwareVersion: resource.firmwareVersion,
    calibration: calibration && toCalibration(calibration),
  };
}

export function toCalibration(record: CalibrationRecordResource): Device['calibration'] {
  return {
    sensorDsM: record.deviceReadingAtSampling,
    laboratoryEceDsM: record.labConductivityDsM,
    offsetDsM: record.labConductivityDsM - record.deviceReadingAtSampling,
    calibratedAt: record.registeredAt,
    laboratory: record.laboratoryName,
  };
}

/**
 * Stored readings are already validated by the Backend, which discards impossible values,
 * and compensated to 25 °C, which is the value compared with the crop's ECe threshold.
 */
export function toReading(resource: SoilReadingResource): SoilReading {
  return {
    id: toId(resource.id),
    plotId: toId(resource.plotId),
    deviceId: toId(resource.deviceId),
    recordedAt: resource.capturedAt,
    conductivityDsM: resource.compensatedConductivityDsM,
    measurementBasis: 'ECe',
    moisturePercent: resource.moisturePercentage,
    temperatureCelsius: resource.temperatureCelsius,
    quality: 'VALID',
  };
}

export function toCorrectiveAction(resource: CorrectiveActionResource): CorrectiveAction {
  return {
    id: toId(resource.id),
    type: resource.actionType,
    performedAt: resource.executedAt,
    notes: resource.notes ?? '',
    createdBy: toId(resource.registeredBy),
  };
}

export function toAlert(
  resource: SalinityAlertResource,
  actions: CorrectiveActionResource[],
): SalinityAlert {
  return {
    id: toId(resource.id),
    plotId: toId(resource.plotId),
    readingId: toId(resource.soilReadingId),
    severity: resource.severity,
    status: resource.status,
    conductivityDsM: resource.observedConductivityDsM,
    thresholdDsM: resource.appliedThresholdDsM,
    createdAt: resource.generatedAt,
    acknowledgedAt: resource.acknowledgedAt ?? undefined,
    resolvedAt: actions.at(-1)?.registeredAt,
    actions: actions.map(toCorrectiveAction),
  };
}

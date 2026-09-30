export interface CropReference {
  authors: string;
  year: number;
  title: string;
  url: string;
}
export interface Crop {
  id: string;
  nameKey: string;
  scientificName: string;
  salinityThresholdDsM: number;
  /** Percent yield loss per dS/m above the threshold; null when no published slope exists. */
  yieldLossPercentPerDsM: number | null;
  measurementBasis: 'ECe';
  reference: CropReference;
}

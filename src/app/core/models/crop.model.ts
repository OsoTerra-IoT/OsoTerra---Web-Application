export interface Crop {
  id: string;
  nameKey: string;
  scientificName: string;
  salinityThresholdDsM: number;
  yieldLossPercentPerDsM: number;
  measurementBasis: 'ECe';
  reference: { authors: string; year: number; title: string; url: string };
}

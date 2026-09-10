export type Freshness = 'fresh' | 'aging' | 'stale' | 'unavailable';

export interface SourceState {
  source: string;
  observedAt?: string;
  fetchedAt: string;
  freshness: Freshness;
  url?: string;
  note?: string;
}

export interface DayForecast {
  date: string;
  label: string;
  probability: number | null;
  quality: number | null;
  confidence: 'high' | 'moderate' | 'low' | 'unavailable';
  peakStart?: string;
  peakEnd?: string;
  sunset?: string;
  geometry: number;
  cloudOpen: number | null;
  cloudBasis: 'sun-corridor' | 'local-fallback' | 'unavailable';
  flowIndex: 'dry' | 'trickle' | 'light' | 'good' | 'strong' | 'unknown';
  flowScore: number | null;
  clarity: number | null;
  why: string;
  activeGeometry: boolean;
}

export interface FirefallSnapshot {
  mode: 'preseason' | 'season' | 'postseason';
  generatedAt: string;
  seasonYear: number;
  headline: DayForecast | null;
  days: DayForecast[];
  bestDay: DayForecast | null;
  accessStatus: string;
  alerts: string[];
  sources: SourceState[];
  methodologyVersion: string;
  disclaimer: string;
}

import { HORSETAIL } from './config';
import type { SourceState } from './types';

type GridValue = { validTime: string; value: number | null };
type GridSeries = { values?: GridValue[] };

type NWSGrid = {
  properties?: {
    updateTime?: string;
    skyCover?: GridSeries;
    visibility?: GridSeries;
    temperature?: GridSeries;
    relativeHumidity?: GridSeries;
    quantitativePrecipitation?: GridSeries;
    probabilityOfPrecipitation?: GridSeries;
    snowLevel?: GridSeries;
  };
};

export interface NWSData {
  grid: NWSGrid | null;
  source: SourceState;
}

function startOfInterval(validTime: string) {
  return new Date(validTime.split('/')[0]).getTime();
}

export function valueNear(series: GridSeries | undefined, target: Date): number | null {
  const values = series?.values?.filter(v => v.value !== null) || [];
  if (!values.length) return null;
  let best = values[0];
  let bestDelta = Math.abs(startOfInterval(best.validTime) - target.getTime());
  for (const v of values.slice(1)) {
    const d = Math.abs(startOfInterval(v.validTime) - target.getTime());
    if (d < bestDelta) { best = v; bestDelta = d; }
  }
  return best.value;
}

export async function fetchNWS(): Promise<NWSData> {
  const fetchedAt = new Date().toISOString();
  try {
    const headers = { 'User-Agent': 'YosemiteFirefallLive/1.0 (independent public tool)', Accept: 'application/geo+json' };
    const pointRes = await fetch(`https://api.weather.gov/points/${HORSETAIL.lat},${HORSETAIL.lon}`, { headers, next: { revalidate: 1800 } });
    if (!pointRes.ok) throw new Error(`NWS points ${pointRes.status}`);
    const point = await pointRes.json();
    const gridUrl = point?.properties?.forecastGridData;
    if (!gridUrl) throw new Error('NWS grid URL missing');
    const gridRes = await fetch(gridUrl, { headers, next: { revalidate: 900 } });
    if (!gridRes.ok) throw new Error(`NWS grid ${gridRes.status}`);
    const grid = await gridRes.json() as NWSGrid;
    const observedAt = grid.properties?.updateTime;
    const ageMs = observedAt ? Date.now() - new Date(observedAt).getTime() : Infinity;
    return { grid, source: { source: 'National Weather Service', observedAt, fetchedAt, freshness: ageMs < 3 * 3600_000 ? 'fresh' : ageMs < 12 * 3600_000 ? 'aging' : 'stale', url: 'https://api.weather.gov/' } };
  } catch (error) {
    return { grid: null, source: { source: 'National Weather Service', fetchedAt, freshness: 'unavailable', note: error instanceof Error ? error.message : 'Unavailable' } };
  }
}

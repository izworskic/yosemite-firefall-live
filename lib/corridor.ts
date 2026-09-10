import { HORSETAIL } from './config';
import { fetchNWSAt, valueNear, type NWSData } from './nws';
import type { SourceState } from './types';

const DISTANCES_KM = [10, 25, 50, 100] as const;
const REPRESENTATIVE_BEARING = 255;
const R_EARTH_KM = 6371.0088;

function toRad(n: number) { return n * Math.PI / 180; }
function toDeg(n: number) { return n * 180 / Math.PI; }

export function destinationPoint(lat: number, lon: number, bearingDeg: number, distanceKm: number) {
  const delta = distanceKm / R_EARTH_KM;
  const theta = toRad(bearingDeg);
  const phi1 = toRad(lat);
  const lambda1 = toRad(lon);
  const phi2 = Math.asin(Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta));
  const lambda2 = lambda1 + Math.atan2(Math.sin(theta) * Math.sin(delta) * Math.cos(phi1), Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2));
  return { lat: toDeg(phi2), lon: ((toDeg(lambda2) + 540) % 360) - 180 };
}

export interface CorridorData {
  points: NWSData[];
  source: SourceState;
  bearing: number;
}

export async function fetchWesternSunCorridor(): Promise<CorridorData> {
  const fetchedAt = new Date().toISOString();
  const points = await Promise.all(DISTANCES_KM.map(async distance => {
    const p = destinationPoint(HORSETAIL.lat, HORSETAIL.lon, REPRESENTATIVE_BEARING, distance);
    return fetchNWSAt(p.lat, p.lon, `NWS sun corridor ${distance} km`);
  }));
  const available = points.filter(p => p.grid !== null);
  const freshness: SourceState['freshness'] = available.length >= 3
    ? (available.some(p => p.source.freshness === 'stale') ? 'aging' : 'fresh')
    : available.length >= 2 ? 'aging' : 'unavailable';
  const observedTimes = available.map(p => p.source.observedAt).filter((v): v is string => Boolean(v));
  return {
    points,
    bearing: REPRESENTATIVE_BEARING,
    source: {
      source: 'NWS western sun corridor',
      fetchedAt,
      observedAt: observedTimes.sort().at(-1),
      freshness,
      url: 'https://api.weather.gov/',
      note: `${available.length}/${DISTANCES_KM.length} corridor grid points available`
    }
  };
}

export function corridorCloudOpen(corridor: CorridorData, target: Date): number | null {
  const opens = corridor.points
    .map(point => valueNear(point.grid?.properties?.skyCover, target))
    .filter((v): v is number => v !== null)
    .map(cover => Math.max(0, Math.min(1, 1 - cover / 100)));
  if (opens.length < 2) return null;
  const mean = opens.reduce((a, b) => a + b, 0) / opens.length;
  const weakest = Math.min(...opens);
  // A single opaque layer anywhere along the incoming sunlight path is more damaging
  // than an ordinary area-average cloud percentage, so the worst point dominates.
  return Math.max(0, Math.min(1, 0.65 * weakest + 0.35 * mean));
}

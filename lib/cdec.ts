import { CDEC_STATIONS, CDEC_SWE_SENSOR } from './config';
import type { SourceState } from './types';

export interface SnowStationReading {
  id: string;
  sweInches: number | null;
  trend3DayInches: number | null;
  observedAt?: string;
}

export interface CDECData {
  sweInches: number | null;
  trend: number | null;
  stations: SnowStationReading[];
  source: SourceState;
}

const STATION_WEIGHTS: Record<string, number> = {
  GIN: 0.65, // Gin Flat: nearer/lower-elevation proxy for the El Capitan headwater zone.
  STR: 0.35  // Ostrander: higher-elevation Sierra snowpack bracket.
};

function numeric(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function stationId(row: Record<string, unknown>) {
  return String(row.stationId ?? row.station_id ?? row.STATION_ID ?? row.station ?? row.Station ?? '').trim().toUpperCase();
}

function rowDate(row: Record<string, unknown>) {
  const raw = row.date ?? row.obsDate ?? row.OBS_DATE ?? row.observationDate ?? row.DATE;
  const value = raw == null ? '' : String(raw);
  const ms = Date.parse(value);
  return { value: value || undefined, ms: Number.isFinite(ms) ? ms : 0 };
}

function rowValue(row: Record<string, unknown>) {
  return numeric(row.value ?? row.VALUE ?? row.obsValue ?? row.OBS_VALUE);
}

function readingFor(id: string, rows: Record<string, unknown>[]): SnowStationReading {
  // Sort by observation time rather than trusting CDEC response ordering.
  const parsed = rows
    .filter(row => stationId(row) === id)
    .map(row => ({ swe: rowValue(row), date: rowDate(row) }))
    .filter((row): row is { swe: number; date: { value?: string; ms: number } } => row.swe !== null && row.swe >= 0)
    .sort((a, b) => a.date.ms - b.date.ms);

  if (!parsed.length) return { id, sweInches: null, trend3DayInches: null };
  const latest = parsed.at(-1)!;
  const targetMs = latest.date.ms - 3 * 86400_000;
  let baseline = parsed[0];
  for (const candidate of parsed) {
    if (candidate.date.ms <= targetMs) baseline = candidate;
    else break;
  }
  const trend = latest.date.ms && baseline.date.ms && latest.date.ms !== baseline.date.ms
    ? latest.swe - baseline.swe
    : parsed.length >= 2 ? latest.swe - parsed[Math.max(0, parsed.length - 4)].swe : null;
  return { id, sweInches: latest.swe, trend3DayInches: trend, observedAt: latest.date.value };
}

function weighted(readings: SnowStationReading[], key: 'sweInches' | 'trend3DayInches') {
  const valid = readings.filter(r => r[key] !== null && Number.isFinite(r[key]));
  if (!valid.length) return null;
  const totalWeight = valid.reduce((sum, r) => sum + (STATION_WEIGHTS[r.id] ?? 1), 0);
  return valid.reduce((sum, r) => sum + (r[key] as number) * (STATION_WEIGHTS[r.id] ?? 1), 0) / totalWeight;
}

export async function fetchCDEC(): Promise<CDECData> {
  const fetchedAt = new Date().toISOString();
  const emptyStations = CDEC_STATIONS.map(id => ({ id, sweInches: null, trend3DayInches: null }));
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 14 * 86400_000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const url = `https://cdec.water.ca.gov/dynamicapp/req/JSONDataServlet?Stations=${CDEC_STATIONS.join('%2C')}&SensorNums=${CDEC_SWE_SENSOR}&dur_code=D&Start=${fmt(start)}&End=${fmt(end)}`;
    const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(9000) });
    if (!res.ok) throw new Error(`CDEC ${res.status}`);
    const raw = await res.json();
    const rows = (Array.isArray(raw) ? raw : []) as Record<string, unknown>[];
    const stations = CDEC_STATIONS.map(id => readingFor(id, rows));
    const sweInches = weighted(stations, 'sweInches');
    const trend = weighted(stations, 'trend3DayInches');
    const latestObserved = stations
      .map(s => s.observedAt)
      .filter((v): v is string => Boolean(v))
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
    const validCount = stations.filter(s => s.sweInches !== null).length;
    return {
      sweInches,
      trend,
      stations,
      source: {
        source: 'California DWR CDEC — Gin Flat + Ostrander snow-water proxy',
        observedAt: latestObserved,
        fetchedAt,
        freshness: validCount > 0 ? 'fresh' : 'aging',
        url: 'https://cdec.water.ca.gov/',
        note: `${validCount}/${stations.length} snow stations valid; weighted 65% Gin Flat / 35% Ostrander when both are available`
      }
    };
  } catch (error) {
    return {
      sweInches: null,
      trend: null,
      stations: emptyStations,
      source: {
        source: 'California DWR CDEC — Gin Flat + Ostrander snow-water proxy',
        fetchedAt,
        freshness: 'unavailable',
        note: error instanceof Error ? error.message : 'Unavailable'
      }
    };
  }
}

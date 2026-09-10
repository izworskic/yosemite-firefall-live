import { destinationPoint } from './corridor';
import { HORSETAIL } from './config';
import type { SourceState } from './types';

const CATALOG = 'https://tds.scigw.unidata.ucar.edu/thredds/catalog/satellite/goes/18/products/CloudMask/CONUS/current/catalog.xml';
const NCSS_ROOT = 'https://tds.scigw.unidata.ucar.edu/thredds/ncss/grid/';
const DISTANCES_KM = [10, 25, 50, 100] as const;
const BEARING = 255;

type GoesFrame = {
  urlPath: string;
  observedAt: Date;
};

type GoesPoint = {
  distanceKm: number;
  openness: number | null;
  quality: number | null;
};

export interface GoesNowcast {
  openness: number | null;
  previousOpenness: number | null;
  trend: 'clearing' | 'clouding' | 'steady' | 'unknown';
  points: GoesPoint[];
  source: SourceState;
}

function frameTimeFromName(value: string): Date | null {
  const m = value.match(/_s(\d{4})(\d{3})(\d{2})(\d{2})(\d{2})/);
  if (!m) return null;
  const [, year, day, hour, minute, second] = m;
  const start = Date.UTC(Number(year), 0, 1, Number(hour), Number(minute), Number(second));
  return new Date(start + (Number(day) - 1) * 86400_000);
}

export function parseCatalogFrames(xml: string): GoesFrame[] {
  const paths = [...xml.matchAll(/urlPath="([^"]*OR_ABI-L2-ACMC-[^"]+\.nc)"/g)].map(m => m[1]);
  const unique = [...new Set(paths)];
  return unique
    .map(urlPath => ({ urlPath, observedAt: frameTimeFromName(urlPath) }))
    .filter((f): f is GoesFrame => f.observedAt instanceof Date && !Number.isNaN(f.observedAt.getTime()))
    .sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime());
}

function splitCsvLine(line: string) {
  const out: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { out.push(current.trim()); current = ''; }
    else current += c;
  }
  out.push(current.trim());
  return out;
}

export function parseMaskCsv(csv: string): { openness: number | null; quality: number | null } {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { openness: null, quality: null };
  const headers = splitCsvLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  const values = splitCsvLine(lines[lines.length - 1]).map(v => v.replace(/^"|"$/g, '').trim());
  const find = (needle: string) => headers.findIndex(h => h === needle || h.endsWith(`.${needle}`) || h.includes(needle));
  const acmIndex = find('ACM');
  const dqfIndex = find('DQF');
  const acm = acmIndex >= 0 ? Number(values[acmIndex]) : NaN;
  const dqf = dqfIndex >= 0 ? Number(values[dqfIndex]) : 0;
  if (!Number.isFinite(acm) || acm < 0 || acm > 3 || (Number.isFinite(dqf) && dqf !== 0)) return { openness: null, quality: Number.isFinite(dqf) ? dqf : null };
  // NOAA Enterprise Cloud Mask: 0 clear, 1 probably clear, 2 probably cloudy, 3 cloudy.
  const openness = [1, 0.72, 0.28, 0][acm];
  return { openness, quality: Number.isFinite(dqf) ? dqf : null };
}

async function fetchPoint(frame: GoesFrame, lat: number, lon: number) {
  const params = new URLSearchParams({ var: 'ACM,DQF', latitude: lat.toFixed(5), longitude: lon.toFixed(5), time: 'present', accept: 'csv' });
  const res = await fetch(`${NCSS_ROOT}${frame.urlPath}?${params}`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(7000) });
  if (!res.ok) throw new Error(`GOES NCSS ${res.status}`);
  return parseMaskCsv(await res.text());
}

function aggregate(values: Array<number | null>) {
  const good = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (good.length < 2) return null;
  const mean = good.reduce((a, b) => a + b, 0) / good.length;
  const weakest = Math.min(...good);
  return Math.max(0, Math.min(1, 0.6 * weakest + 0.4 * mean));
}

async function sampleFrame(frame: GoesFrame) {
  const results = await Promise.allSettled(DISTANCES_KM.map(async distanceKm => {
    const p = destinationPoint(HORSETAIL.lat, HORSETAIL.lon, BEARING, distanceKm);
    const mask = await fetchPoint(frame, p.lat, p.lon);
    return { distanceKm, ...mask };
  }));
  const points: GoesPoint[] = results.map((r, i) => r.status === 'fulfilled' ? r.value : { distanceKm: DISTANCES_KM[i], openness: null, quality: null });
  return { points, openness: aggregate(points.map(p => p.openness)) };
}

export async function fetchGOESNowcast(): Promise<GoesNowcast> {
  const fetchedAt = new Date().toISOString();
  try {
    const catalogRes = await fetch(CATALOG, { next: { revalidate: 300 }, signal: AbortSignal.timeout(7000) });
    if (!catalogRes.ok) throw new Error(`GOES catalog ${catalogRes.status}`);
    const frames = parseCatalogFrames(await catalogRes.text());
    if (!frames.length) throw new Error('No GOES-18 CONUS CloudMask frames in catalog');
    const latest = frames.at(-1)!;
    const targetPreviousMs = latest.observedAt.getTime() - 30 * 60_000;
    const previous = [...frames].reverse().find(f => f.observedAt.getTime() <= targetPreviousMs) ?? frames[Math.max(0, frames.length - 2)];
    const [nowSample, previousSample] = await Promise.all([sampleFrame(latest), previous ? sampleFrame(previous) : Promise.resolve({ points: [] as GoesPoint[], openness: null })]);
    const delta = nowSample.openness !== null && previousSample.openness !== null ? nowSample.openness - previousSample.openness : null;
    const trend = delta === null ? 'unknown' : delta > .12 ? 'clearing' : delta < -.12 ? 'clouding' : 'steady';
    const ageMs = Date.now() - latest.observedAt.getTime();
    const freshness: SourceState['freshness'] = ageMs <= 20 * 60_000 ? 'fresh' : ageMs <= 60 * 60_000 ? 'aging' : 'stale';
    return {
      openness: nowSample.openness,
      previousOpenness: previousSample.openness,
      trend,
      points: nowSample.points,
      source: {
        source: 'NOAA GOES-18 Clear Sky Mask via Unidata',
        observedAt: latest.observedAt.toISOString(),
        fetchedAt,
        freshness,
        url: 'https://www.ncei.noaa.gov/products/goes-terrestrial-weather-abi-glm',
        note: `${nowSample.points.filter(p => p.openness !== null).length}/${DISTANCES_KM.length} western-corridor satellite points valid`
      }
    };
  } catch (error) {
    return {
      openness: null,
      previousOpenness: null,
      trend: 'unknown',
      points: DISTANCES_KM.map(distanceKm => ({ distanceKm, openness: null, quality: null })),
      source: {
        source: 'NOAA GOES-18 Clear Sky Mask via Unidata',
        fetchedAt,
        freshness: 'unavailable',
        note: error instanceof Error ? error.message : 'Unavailable'
      }
    };
  }
}

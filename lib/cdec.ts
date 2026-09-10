import { CDEC_STATIONS, CDEC_SWE_SENSOR } from './config';
import type { SourceState } from './types';

export interface CDECData {
  sweInches: number | null;
  trend: number | null;
  source: SourceState;
}

function numeric(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function fetchCDEC(): Promise<CDECData> {
  const fetchedAt = new Date().toISOString();
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 14 * 86400_000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const url = `https://cdec.water.ca.gov/dynamicapp/req/JSONDataServlet?Stations=${CDEC_STATIONS.join('%2C')}&SensorNums=${CDEC_SWE_SENSOR}&dur_code=D&Start=${fmt(start)}&End=${fmt(end)}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`CDEC ${res.status}`);
    const raw = await res.json();
    const rows = Array.isArray(raw) ? raw : [];
    const values = rows.map((r: any) => numeric(r.value ?? r.VALUE ?? r.obsValue)).filter((v): v is number => v !== null && v >= 0);
    const sweInches = values.length ? values[values.length - 1] : null;
    const trend = values.length >= 2 ? values[values.length - 1] - values[Math.max(0, values.length - 4)] : null;
    const observedAt = rows.length ? String(rows[rows.length - 1]?.date ?? rows[rows.length - 1]?.obsDate ?? '') || undefined : undefined;
    return { sweInches, trend, source: { source: 'California Data Exchange Center (CDEC)', observedAt, fetchedAt, freshness: sweInches !== null ? 'fresh' : 'aging', url: 'https://cdec.water.ca.gov/' } };
  } catch (error) {
    return { sweInches: null, trend: null, source: { source: 'California Data Exchange Center (CDEC)', fetchedAt, freshness: 'unavailable', note: error instanceof Error ? error.message : 'Unavailable' } };
  }
}

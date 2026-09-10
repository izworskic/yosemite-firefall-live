import { SITE } from './config';
import type { SourceState } from './types';

export async function fetchNPSAlerts() {
  const fetchedAt = new Date().toISOString();
  const key = process.env.NPS_API_KEY;
  if (!key) return { alerts: [] as string[], source: { source: 'National Park Service alerts', fetchedAt, freshness: 'unavailable', note: 'Set NPS_API_KEY to enable live Yosemite alerts.', url: 'https://www.nps.gov/yose/planyourvisit/conditions.htm' } as SourceState };
  try {
    const url = `https://developer.nps.gov/api/v1/alerts?parkCode=${SITE.npsParkCode}&limit=10&api_key=${encodeURIComponent(key)}`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(`NPS ${res.status}`);
    const json = await res.json();
    const alerts = (json?.data || []).map((a: any) => a?.title).filter(Boolean).slice(0, 6);
    return { alerts, source: { source: 'National Park Service alerts', fetchedAt, freshness: 'fresh', url: 'https://www.nps.gov/yose/planyourvisit/conditions.htm' } as SourceState };
  } catch (error) {
    return { alerts: [] as string[], source: { source: 'National Park Service alerts', fetchedAt, freshness: 'unavailable', note: error instanceof Error ? error.message : 'Unavailable', url: 'https://www.nps.gov/yose/planyourvisit/conditions.htm' } as SourceState };
  }
}

import { USGS_HAPPY_ISLES } from './config';
import type { SourceState } from './types';

export interface USGSData {
  dischargeCfs: number | null;
  observedAt?: string;
  source: SourceState;
}

export async function fetchUSGS(): Promise<USGSData> {
  const fetchedAt = new Date().toISOString();
  const filter = encodeURIComponent(`monitoring_location_id='${USGS_HAPPY_ISLES}' AND parameter_code='00060'`);
  const modern = `https://api.waterdata.usgs.gov/ogcapi/v1/collections/latest-continuous/items?f=json&filter=${filter}`;
  try {
    const res = await fetch(modern, { headers: { Accept: 'application/geo+json' }, next: { revalidate: 900 } });
    if (!res.ok) throw new Error(`USGS modern ${res.status}`);
    const json = await res.json();
    const feature = json?.features?.find((f: any) => f?.properties?.parameter_code === '00060') ?? json?.features?.[0];
    const value = Number(feature?.properties?.value);
    const observedAt = feature?.properties?.time;
    if (!Number.isFinite(value)) throw new Error('USGS discharge missing');
    return { dischargeCfs: value, observedAt, source: { source: 'USGS Merced River at Happy Isles', observedAt, fetchedAt, freshness: observedAt && Date.now() - new Date(observedAt).getTime() < 6 * 3600_000 ? 'fresh' : 'aging', url: 'https://waterdata.usgs.gov/monitoring-location/USGS-11264500/' } };
  } catch (modernError) {
    // Temporary migration fallback. Remove before legacy WaterServices decommissioning.
    try {
      const legacy = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=11264500&parameterCd=00060&siteStatus=all`;
      const res = await fetch(legacy, { next: { revalidate: 900 } });
      if (!res.ok) throw new Error(`USGS legacy ${res.status}`);
      const json = await res.json();
      const item = json?.value?.timeSeries?.[0]?.values?.[0]?.value?.at(-1);
      const value = Number(item?.value);
      if (!Number.isFinite(value)) throw new Error('USGS legacy discharge missing');
      return { dischargeCfs: value, observedAt: item?.dateTime, source: { source: 'USGS Merced River at Happy Isles', observedAt: item?.dateTime, fetchedAt, freshness: 'aging', url: 'https://waterdata.usgs.gov/monitoring-location/USGS-11264500/', note: 'Served through temporary legacy fallback during USGS API migration.' } };
    } catch (legacyError) {
      return { dischargeCfs: null, source: { source: 'USGS Merced River at Happy Isles', fetchedAt, freshness: 'unavailable', note: `${modernError instanceof Error ? modernError.message : 'Modern API failed'}; ${legacyError instanceof Error ? legacyError.message : 'legacy failed'}` } };
    }
  }
}

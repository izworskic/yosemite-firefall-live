import { fetchCDEC } from './cdec';
import { corridorCloudOpen, fetchWesternSunCorridor } from './corridor';
import { fetchGOESNowcast, type GoesNowcast } from './goes';
import { fetchNPSAlerts } from './nps';
import { fetchNWS, valueNear } from './nws';
import { solarForDate, localTime, zonedDateKey } from './solar';
import { bestTripWindows } from './trip';
import { fetchUSGS } from './usgs';
import type { DayForecast, FirefallSnapshot } from './types';

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const pct = (n: number) => Math.round(clamp(n) * 100);

function localPart(now: Date, part: 'year'|'month'|'day') {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', [part]: 'numeric' }).format(now));
}

function modeForDate(now: Date) {
  const month = localPart(now, 'month');
  const day = localPart(now, 'day');
  if (month === 2 && day >= 5 && day <= 28) return 'season' as const;
  if (month < 2 || month >= 8) return 'preseason' as const;
  return 'postseason' as const;
}

function confidenceFor(geometry: number, available: number, sourcePenalty: number, cloudBasis: DayForecast['cloudBasis']) {
  if (geometry <= 0) return 'high' as const;
  const cloudPenalty = cloudBasis === 'goes-nowcast' || cloudBasis === 'sun-corridor' ? 0 : cloudBasis === 'local-fallback' ? .7 : 1.5;
  const score = available - sourcePenalty - cloudPenalty;
  return score >= 3 ? 'high' as const : score >= 2 ? 'moderate' as const : score >= 1 ? 'low' as const : 'unavailable' as const;
}

/**
 * Conservative Horsetail runoff proxy. Merced discharge can only corroborate
 * source water; it cannot manufacture a favorable Horsetail signal by itself.
 */
export function flowModel(
  swe: number | null,
  sweTrend3Day: number | null,
  temperatureC: number | null,
  precipMm: number | null,
  mercedCfs: number | null
) {
  if (swe === null && precipMm === null) return { score: null, index: 'unknown' as const };

  const snowAvailability = swe === null ? null : clamp((swe - 0.25) / 12);
  const thermalMelt = temperatureC === null ? 0.35 : clamp((temperatureC + 2) / 10);
  // Falling SWE is useful corroboration that stored snow is actively releasing water.
  const observedMelt = sweTrend3Day === null ? 0 : clamp(-sweTrend3Day / 1.5);
  const rainSource = precipMm === null ? 0 : clamp(precipMm / 12);

  const snowRunoff = snowAvailability === null
    ? 0
    : snowAvailability * (0.25 + 0.55 * thermalMelt + 0.20 * observedMelt);
  const sourceWater = Math.max(snowRunoff, 0.90 * rainSource);

  const basin = mercedCfs === null ? 0.5 : clamp((Math.log10(Math.max(1, mercedCfs)) - 1.4) / 1.5);
  const score = clamp(sourceWater * (0.88 + 0.12 * basin));
  const index = score < .12 ? 'dry' : score < .26 ? 'trickle' : score < .43 ? 'light' : score < .72 ? 'good' : 'strong';
  return { score, index } as const;
}

function localCloudOpen(skyCover: number | null) {
  if (skyCover === null) return null;
  const c = clamp(skyCover / 100);
  return clamp(1 - Math.pow(c, 1.35));
}

function clarityModel(visibilityM: number | null, rh: number | null) {
  if (visibilityM === null && rh === null) return null;
  const vis = visibilityM === null ? .65 : clamp(visibilityM / 16000);
  const humidity = rh === null ? .8 : clamp(1 - Math.max(0, rh - 55) / 65);
  return clamp(.72 * vis + .28 * humidity);
}

function mergeNowcast(forecast: number | null, goes: GoesNowcast | null, hoursToPeak: number) {
  if (!goes || goes.openness === null || hoursToPeak < -.5 || hoursToPeak > 6) return { value: forecast, used: false };
  if (forecast === null) return { value: goes.openness, used: true };
  const satelliteWeight = hoursToPeak <= 1.5 ? .72 : hoursToPeak <= 3 ? .52 : .30;
  return { value: clamp(goes.openness * satelliteWeight + forecast * (1 - satelliteWeight)), used: true };
}

export function combineProbability(geometry: number, water: number | null, cloudOpen: number | null, clarity: number | null) {
  if (geometry <= 0) return 0;
  if (water === null || cloudOpen === null) return null;
  const clear = clarity ?? .78;
  return clamp(Math.pow(geometry, 0.8) * Math.pow(water, 0.9) * Math.pow(cloudOpen, 1.15) * Math.pow(clear, 0.35));
}

export async function buildFirefallSnapshot(now = new Date()): Promise<FirefallSnapshot> {
  const mode = modeForDate(now);
  const localYear = localPart(now, 'year');
  const year = localYear + (localPart(now, 'month') > 6 ? 1 : 0);
  let start = mode === 'season' ? now : new Date(`${year}-02-10T20:00:00Z`);
  if (mode === 'season') {
    const tonightSolar = solarForDate(start);
    if (now.getTime() > tonightSolar.peakEnd.getTime() + 30 * 60_000) start = new Date(start.getTime() + 86400_000);
  }
  const firstSolar = solarForDate(start);
  const hoursToFirstPeak = (firstSolar.peakStart.getTime() - now.getTime()) / 3600_000;
  const shouldNowcast = mode === 'season' && hoursToFirstPeak >= -.5 && hoursToFirstPeak <= 6;

  const [nws, corridor, cdec, usgs, nps, goes] = await Promise.all([
    fetchNWS(), fetchWesternSunCorridor(), fetchCDEC(), fetchUSGS(), fetchNPSAlerts(),
    shouldNowcast ? fetchGOESNowcast() : Promise.resolve(null)
  ]);
  const days: DayForecast[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(start.getTime() + i * 86400_000);
    const solar = solarForDate(date);
    const p = nws.grid?.properties;
    const corridorOpen = corridorCloudOpen(corridor, solar.peakStart);
    const localOpen = localCloudOpen(valueNear(p?.skyCover, solar.peakStart));
    const forecastCloud = corridorOpen ?? localOpen;
    const hoursToPeak = (solar.peakStart.getTime() - now.getTime()) / 3600_000;
    const nowcast = i === 0 ? mergeNowcast(forecastCloud, goes, hoursToPeak) : { value: forecastCloud, used: false };
    const cloudOpen = nowcast.value;
    const cloudBasis: DayForecast['cloudBasis'] = nowcast.used ? 'goes-nowcast' : corridorOpen !== null ? 'sun-corridor' : localOpen !== null ? 'local-fallback' : 'unavailable';
    const temperature = valueNear(p?.temperature, new Date(solar.sunset.getTime() - 4 * 3600_000));
    const precip = valueNear(p?.quantitativePrecipitation, solar.sunset);
    const visibility = valueNear(p?.visibility, solar.peakStart);
    const rh = valueNear(p?.relativeHumidity, solar.peakStart);
    const clarity = clarityModel(visibility, rh);
    const flow = flowModel(cdec.sweInches, cdec.trend, temperature, precip, usgs.dischargeCfs);
    const probability = combineProbability(solar.geometry, flow.score, cloudOpen, clarity);
    const quality = probability === null ? null : pct(clamp(.52 * solar.geometry + .28 * (flow.score ?? 0) + .20 * (clarity ?? .7)));
    const available = [cloudOpen, flow.score, clarity].filter(v => v !== null).length;
    let sourcePenalty = [nws.source, corridor.source, cdec.source, usgs.source].filter(s => s.freshness === 'stale' || s.freshness === 'unavailable').length * .25;
    if (shouldNowcast && i === 0 && (!goes || goes.source.freshness === 'unavailable' || goes.source.freshness === 'stale')) sourcePenalty += .3;
    const skyPhrase = cloudOpen === null
      ? 'western sun-corridor data unavailable'
      : nowcast.used && goes ? `${pct(cloudOpen)}% western sun corridor with GOES observation${goes.trend !== 'unknown' ? ` (${goes.trend})` : ''}`
      : `${pct(cloudOpen)}% modeled western sun-corridor openness`;
    const whyParts = [
      solar.geometry > .8 ? 'excellent Firefall geometry' : solar.geometry > .35 ? 'usable Firefall geometry' : 'weak seasonal geometry',
      flow.index === 'good' || flow.index === 'strong' ? 'favorable runoff signal' : flow.index === 'unknown' ? 'uncertain runoff' : 'limited runoff signal',
      skyPhrase
    ];
    days.push({
      date: zonedDateKey(date),
      label: new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short' }).format(date),
      probability: mode === 'season' ? (probability === null ? null : pct(probability)) : null,
      quality,
      confidence: confidenceFor(solar.geometry, available, sourcePenalty, cloudBasis),
      peakStart: localTime(solar.peakStart), peakEnd: localTime(solar.peakEnd), sunset: localTime(solar.sunset),
      geometry: pct(solar.geometry), terrainBased: solar.terrainBased,
      cloudOpen: cloudOpen === null ? null : pct(cloudOpen), cloudBasis, cloudTrend: nowcast.used && goes ? goes.trend : undefined,
      flowIndex: flow.index, flowScore: flow.score === null ? null : pct(flow.score), clarity: clarity === null ? null : pct(clarity),
      why: whyParts.join(' + '), activeGeometry: solar.geometry > .05
    });
  }

  const scored = days.filter(d => d.probability !== null);
  const bestDay = scored.length ? [...scored].sort((a, b) => (b.probability ?? -1) - (a.probability ?? -1))[0] : null;
  const tripWindows = mode === 'season' ? bestTripWindows(days) : [];
  return {
    mode, generatedAt: new Date().toISOString(), seasonYear: year, headline: mode === 'season' ? days[0] : null, days, bestDay, tripWindows,
    accessStatus: `${year} Firefall-specific access rules are not assumed from prior years. Verify current National Park Service guidance before travel.`,
    alerts: nps.alerts,
    sources: [nws.source, corridor.source, ...(goes ? [goes.source] : []), cdec.source, usgs.source, nps.source],
    methodologyVersion: '0.4.0-experimental-source-gated-water',
    disclaimer: 'Independent experimental decision-support forecast. Not affiliated with or endorsed by the National Park Service.'
  };
}

import { fetchCDEC } from './cdec';
import { corridorCloudOpen, fetchWesternSunCorridor } from './corridor';
import { fetchNPSAlerts } from './nps';
import { fetchNWS, valueNear } from './nws';
import { solarForDate, localTime, zonedDateKey } from './solar';
import { fetchUSGS } from './usgs';
import type { DayForecast, FirefallSnapshot } from './types';

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const pct = (n: number) => Math.round(clamp(n) * 100);

function modeForDate(now: Date) {
  const month = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', month: 'numeric' }).format(now));
  const day = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', day: 'numeric' }).format(now));
  if (month === 2 && day >= 5 && day <= 28) return 'season' as const;
  if (month < 2 || month >= 8) return 'preseason' as const;
  return 'postseason' as const;
}

function confidenceFor(geometry: number, available: number, sourcePenalty: number, cloudBasis: DayForecast['cloudBasis']) {
  if (geometry <= 0) return 'high' as const;
  const corridorPenalty = cloudBasis === 'sun-corridor' ? 0 : cloudBasis === 'local-fallback' ? .7 : 1.5;
  const score = available - sourcePenalty - corridorPenalty;
  return score >= 3 ? 'high' as const : score >= 2 ? 'moderate' as const : score >= 1 ? 'low' as const : 'unavailable' as const;
}

function flowModel(swe: number | null, temperatureC: number | null, precipMm: number | null, mercedCfs: number | null) {
  if (swe === null && temperatureC === null && precipMm === null) return { score: null, index: 'unknown' as const };
  const snow = swe === null ? 0.38 : clamp(swe / 18);
  const melt = temperatureC === null ? 0.35 : clamp((temperatureC - 0.5) / 8);
  const rain = precipMm === null ? 0 : clamp(precipMm / 15);
  const basin = mercedCfs === null ? 0.35 : clamp(Math.log10(Math.max(1, mercedCfs)) / 3);
  const score = clamp(0.46 * snow + 0.29 * melt + 0.17 * rain + 0.08 * basin);
  const index = score < .16 ? 'dry' : score < .30 ? 'trickle' : score < .48 ? 'light' : score < .76 ? 'good' : 'strong';
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

export function combineProbability(geometry: number, water: number | null, cloudOpen: number | null, clarity: number | null) {
  if (geometry <= 0) return 0;
  if (water === null || cloudOpen === null) return null;
  const clear = clarity ?? .78;
  return clamp(Math.pow(geometry, 0.8) * Math.pow(water, 0.9) * Math.pow(cloudOpen, 1.15) * Math.pow(clear, 0.35));
}

export async function buildFirefallSnapshot(now = new Date()): Promise<FirefallSnapshot> {
  const [nws, corridor, cdec, usgs, nps] = await Promise.all([fetchNWS(), fetchWesternSunCorridor(), fetchCDEC(), fetchUSGS(), fetchNPSAlerts()]);
  const mode = modeForDate(now);
  const year = now.getUTCFullYear() + (now.getUTCMonth() > 6 ? 1 : 0);
  const start = mode === 'season' ? now : new Date(`${year}-02-10T20:00:00Z`);
  const days: DayForecast[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(start.getTime() + i * 86400_000);
    const solar = solarForDate(date);
    const p = nws.grid?.properties;
    const corridorOpen = corridorCloudOpen(corridor, solar.peakStart);
    const localOpen = localCloudOpen(valueNear(p?.skyCover, solar.peakStart));
    const cloudOpen = corridorOpen ?? localOpen;
    const cloudBasis: DayForecast['cloudBasis'] = corridorOpen !== null ? 'sun-corridor' : localOpen !== null ? 'local-fallback' : 'unavailable';
    const temperature = valueNear(p?.temperature, new Date(solar.sunset.getTime() - 4 * 3600_000));
    const precip = valueNear(p?.quantitativePrecipitation, solar.sunset);
    const visibility = valueNear(p?.visibility, solar.peakStart);
    const rh = valueNear(p?.relativeHumidity, solar.peakStart);
    const clarity = clarityModel(visibility, rh);
    const flow = flowModel(cdec.sweInches, temperature, precip, usgs.dischargeCfs);
    const probability = combineProbability(solar.geometry, flow.score, cloudOpen, clarity);
    const quality = probability === null ? null : pct(clamp(.52 * solar.geometry + .28 * (flow.score ?? 0) + .20 * (clarity ?? .7)));
    const available = [cloudOpen, flow.score, clarity].filter(v => v !== null).length;
    const sourcePenalty = [nws.source, corridor.source, cdec.source, usgs.source].filter(s => s.freshness === 'stale' || s.freshness === 'unavailable').length * .25;
    const skyPhrase = cloudOpen !== null ? `${pct(cloudOpen)}% modeled western sun-corridor openness` : 'western sun-corridor data unavailable';
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
      geometry: pct(solar.geometry), cloudOpen: cloudOpen === null ? null : pct(cloudOpen), cloudBasis,
      flowIndex: flow.index, flowScore: flow.score === null ? null : pct(flow.score), clarity: clarity === null ? null : pct(clarity),
      why: whyParts.join(' + '), activeGeometry: solar.geometry > .05
    });
  }

  const scored = days.filter(d => d.probability !== null);
  const bestDay = scored.length ? [...scored].sort((a, b) => (b.probability ?? -1) - (a.probability ?? -1))[0] : null;
  return {
    mode, generatedAt: new Date().toISOString(), seasonYear: year, headline: mode === 'season' ? days[0] : null, days, bestDay,
    accessStatus: `${year} Firefall-specific access rules are not assumed from prior years. Verify current National Park Service guidance before travel.`,
    alerts: nps.alerts,
    sources: [nws.source, corridor.source, cdec.source, usgs.source, nps.source],
    methodologyVersion: '0.2.0-experimental-corridor',
    disclaimer: 'Independent experimental decision-support forecast. Not affiliated with or endorsed by the National Park Service.'
  };
}

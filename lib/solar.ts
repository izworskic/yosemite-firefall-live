import SunCalc from 'suncalc';
import { HORSETAIL, SITE } from './config';
import { horizonAngleAt, terrainReady } from './terrain';

const radToCompassDeg = (r: number) => ((r * 180) / Math.PI + 180) % 360;
const radToDeg = (r: number) => (r * 180) / Math.PI;
const clamp = (n: number) => Math.max(0, Math.min(1, n));

export function zonedDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SITE.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function localTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', { timeZone: SITE.timezone, hour: 'numeric', minute: '2-digit' }).format(date);
}

function seasonalAlignment(sunsetAzimuth: number) {
  const [vMin, vMax] = HORSETAIL.viableSunsetAzimuth;
  const [sMin, sMax] = HORSETAIL.strongestSunsetAzimuth;
  if (sunsetAzimuth < vMin || sunsetAzimuth > vMax) return 0;
  if (sunsetAzimuth >= sMin && sunsetAzimuth <= sMax) return 1;
  if (sunsetAzimuth < sMin) return clamp((sunsetAzimuth - vMin) / (sMin - vMin));
  return clamp((vMax - sunsetAzimuth) / (vMax - sMax));
}

export function solarForDate(date: Date) {
  // Anchor the calculation to Yosemite's calendar date, not the server/UTC date.
  // This matters at sunset, when California's evening is already the next UTC day.
  const localDate = zonedDateKey(date);
  const noon = new Date(`${localDate}T20:00:00Z`);
  const times = SunCalc.getTimes(noon, HORSETAIL.lat, HORSETAIL.lon);
  const sunset = times.sunset;
  const sunsetPos = SunCalc.getPosition(sunset, HORSETAIL.lat, HORSETAIL.lon);
  const sunsetAzimuth = radToCompassDeg(sunsetPos.azimuth);
  const seasonal = seasonalAlignment(sunsetAzimuth);

  let peakStart = new Date(sunset.getTime() - 14 * 60_000);
  let peakEnd = new Date(sunset.getTime() - 5 * 60_000);
  let geometry = seasonal;
  let directLightEnd: Date | undefined;
  let terrainBased = false;

  if (seasonal > 0 && terrainReady()) {
    const illuminated: Date[] = [];
    for (let minutesBefore = 35; minutesBefore >= 0; minutesBefore--) {
      const t = new Date(sunset.getTime() - minutesBefore * 60_000);
      const pos = SunCalc.getPosition(t, HORSETAIL.lat, HORSETAIL.lon);
      const azimuth = radToCompassDeg(pos.azimuth);
      const altitude = radToDeg(pos.altitude);
      const horizon = horizonAngleAt(azimuth);
      if (horizon !== null) {
        terrainBased = true;
        if (altitude > horizon + 0.08) illuminated.push(t);
      }
    }
    if (terrainBased) {
      if (illuminated.length === 0) geometry = 0;
      else {
        directLightEnd = illuminated[illuminated.length - 1];
        peakEnd = new Date(directLightEnd.getTime() - 60_000);
        peakStart = new Date(Math.max(illuminated[0].getTime(), directLightEnd.getTime() - 10 * 60_000));
      }
    }
  }

  return { sunset, sunsetAzimuth, geometry, peakStart, peakEnd, directLightEnd, terrainBased };
}

import SunCalc from 'suncalc';
import { HORSETAIL, SITE } from './config';

const radToDeg = (r: number) => ((r * 180) / Math.PI + 180) % 360;

export function zonedDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SITE.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function localTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', { timeZone: SITE.timezone, hour: 'numeric', minute: '2-digit' }).format(date);
}

export function solarForDate(date: Date) {
  const noon = new Date(date);
  noon.setUTCHours(20, 0, 0, 0);
  const times = SunCalc.getTimes(noon, HORSETAIL.lat, HORSETAIL.lon);
  const sunset = times.sunset;
  const pos = SunCalc.getPosition(sunset, HORSETAIL.lat, HORSETAIL.lon);
  const sunsetAzimuth = radToDeg(pos.azimuth);
  const [vMin, vMax] = HORSETAIL.viableSunsetAzimuth;
  const [sMin, sMax] = HORSETAIL.strongestSunsetAzimuth;
  let geometry = 0;
  if (sunsetAzimuth >= vMin && sunsetAzimuth <= vMax) {
    if (sunsetAzimuth >= sMin && sunsetAzimuth <= sMax) geometry = 1;
    else if (sunsetAzimuth < sMin) geometry = (sunsetAzimuth - vMin) / (sMin - vMin);
    else geometry = (vMax - sunsetAzimuth) / (vMax - sMax);
  }
  geometry = Math.max(0, Math.min(1, geometry));

  // Firefall color typically concentrates in the last 5–15 minutes before sunset.
  // Keep public timing conservative until a DEM ray profile is added.
  const peakStart = new Date(sunset.getTime() - 14 * 60_000);
  const peakEnd = new Date(sunset.getTime() - 5 * 60_000);
  return { sunset, sunsetAzimuth, geometry, peakStart, peakEnd };
}

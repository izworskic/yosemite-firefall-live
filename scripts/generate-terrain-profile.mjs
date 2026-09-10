import { mkdir, writeFile } from 'node:fs/promises';

const FALL = { lat: 37.72912, lon: -119.62848 };
const BEARINGS = Array.from({ length: 18 }, (_, i) => 246 + i);
const DISTANCES_KM = [0.25,0.5,0.75,1,1.5,2,3,4,5,7.5,10,15,20,30,40];
const R = 6371.0088;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rad = d => d * Math.PI / 180;
const deg = r => r * 180 / Math.PI;

function destination(lat, lon, bearing, km) {
  const delta = km / R, theta = rad(bearing), phi1 = rad(lat), lambda1 = rad(lon);
  const phi2 = Math.asin(Math.sin(phi1)*Math.cos(delta)+Math.cos(phi1)*Math.sin(delta)*Math.cos(theta));
  const lambda2 = lambda1 + Math.atan2(Math.sin(theta)*Math.sin(delta)*Math.cos(phi1), Math.cos(delta)-Math.sin(phi1)*Math.sin(phi2));
  return { lat: deg(phi2), lon: ((deg(lambda2)+540)%360)-180 };
}

async function elevation(lat, lon, attempt=0) {
  const url = `https://epqs.nationalmap.gov/v1/json?x=${lon.toFixed(6)}&y=${lat.toFixed(6)}&wkid=4326&units=Meters&includeDate=false`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'YosemiteFirefallLive terrain preprocessor' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const value = Number(json.value);
    if (!Number.isFinite(value)) throw new Error('invalid elevation');
    return { value, resolution: Number(json.resolution) || null };
  } catch (err) {
    if (attempt < 3) { await sleep(350 * (attempt + 1)); return elevation(lat, lon, attempt + 1); }
    throw err;
  }
}

const fall = await elevation(FALL.lat, FALL.lon);
const profiles = [];
for (const bearing of BEARINGS) {
  let maxAngle = -90, obstructionDistanceKm = 0, obstructionElevationM = fall.value;
  for (const distanceKm of DISTANCES_KM) {
    const p = destination(FALL.lat, FALL.lon, bearing, distanceKm);
    const e = await elevation(p.lat, p.lon);
    const angle = deg(Math.atan2(e.value - fall.value, distanceKm * 1000));
    if (angle > maxAngle) { maxAngle = angle; obstructionDistanceKm = distanceKm; obstructionElevationM = e.value; }
    await sleep(35);
  }
  profiles.push({ bearing, horizonElevationDeg: Number(maxAngle.toFixed(4)), obstructionDistanceKm, obstructionElevationM: Number(obstructionElevationM.toFixed(2)) });
  console.log(`bearing ${bearing}: horizon ${maxAngle.toFixed(3)}°`);
}

const output = {
  status: 'ready',
  generatedAt: new Date().toISOString(),
  source: 'USGS 3DEP Elevation Point Query Service',
  sourceUrl: 'https://epqs.nationalmap.gov/v1/json',
  fall: FALL,
  fallElevationM: Number(fall.value.toFixed(2)),
  inputResolutionM: fall.resolution,
  bearings: [246,263],
  sampleDistancesKm: DISTANCES_KM,
  profiles
};
await mkdir('data', { recursive: true });
await writeFile('data/terrain-profile.json', JSON.stringify(output, null, 2) + '\n');
console.log('Wrote data/terrain-profile.json');

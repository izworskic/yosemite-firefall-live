import terrainRaw from '@/data/terrain-profile.json';

type TerrainPoint = { bearing: number; horizonElevationDeg: number; obstructionDistanceKm: number; obstructionElevationM: number };
type TerrainFile = { status: string; generatedAt: string | null; source: string; fallElevationM: number | null; profiles: TerrainPoint[] };
const terrain = terrainRaw as TerrainFile;

export function terrainReady() {
  return terrain.status === 'ready' && terrain.profiles.length >= 10;
}

export function terrainMetadata() {
  return { ready: terrainReady(), generatedAt: terrain.generatedAt, source: terrain.source, fallElevationM: terrain.fallElevationM };
}

export function horizonAngleAt(bearing: number): number | null {
  if (!terrainReady()) return null;
  const normalized = ((bearing % 360) + 360) % 360;
  const sorted = [...terrain.profiles].sort((a, b) => a.bearing - b.bearing);
  let nearest = sorted[0];
  for (const p of sorted) if (Math.abs(p.bearing - normalized) < Math.abs(nearest.bearing - normalized)) nearest = p;
  return Math.abs(nearest.bearing - normalized) <= 1.25 ? nearest.horizonElevationDeg : null;
}

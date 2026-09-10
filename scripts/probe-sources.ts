import { fetchCDEC } from '../lib/cdec';
import { fetchWesternSunCorridor } from '../lib/corridor';
import { fetchNWS } from '../lib/nws';
import { fetchUSGS } from '../lib/usgs';

async function main() {
  const [nws, corridor, cdec, usgs] = await Promise.all([
    fetchNWS(), fetchWesternSunCorridor(), fetchCDEC(), fetchUSGS()
  ]);
  const corridorValid = corridor.points.filter(p => p.grid !== null).length;
  const cdecValid = cdec.stations.filter(s => s.sweInches !== null).length;
  console.table([
    { source: 'NWS Yosemite grid', state: nws.source.freshness, detail: nws.source.note ?? '' },
    { source: 'NWS western corridor', state: corridor.source.freshness, detail: `${corridorValid}/4 grid points` },
    { source: 'CDEC snow proxy', state: cdec.source.freshness, detail: `${cdecValid}/${cdec.stations.length} stations` },
    { source: 'USGS Happy Isles context', state: usgs.source.freshness, detail: usgs.dischargeCfs === null ? 'no current discharge' : `${usgs.dischargeCfs} cfs` }
  ]);

  const failures: string[] = [];
  if (!nws.grid) failures.push(`NWS Yosemite grid unavailable: ${nws.source.note ?? 'unknown error'}`);
  if (corridorValid < 2) failures.push(`NWS western corridor only ${corridorValid}/4 valid`);
  if (cdecValid < 1) failures.push(`CDEC snow proxy has no valid station: ${cdec.source.note ?? 'unknown error'}`);
  // Happy Isles is intentionally corroborating context and must never be a hard dependency.
  if (failures.length) throw new Error(failures.join(' | '));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

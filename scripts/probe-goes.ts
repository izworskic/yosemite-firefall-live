import { fetchGOESNowcast } from '../lib/goes';

const result = await fetchGOESNowcast();
console.log(JSON.stringify({
  openness: result.openness,
  previousOpenness: result.previousOpenness,
  trend: result.trend,
  source: result.source,
  points: result.points
}, null, 2));

if (result.source.freshness === 'unavailable' || result.openness === null) {
  throw new Error(`GOES-18 source probe failed: ${result.source.note || 'no valid corridor observations'}`);
}

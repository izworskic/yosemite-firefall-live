import type { DayForecast, TripWindow } from './types';

function hashSeed(text: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function rng(seed: number) {
  let state = seed || 0x9e3779b9;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function normalGenerator(seed: number) {
  const random = rng(seed);
  let spare: number | null = null;
  return () => {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let u = 0, v = 0;
    while (u <= Number.EPSILON) u = random();
    while (v <= Number.EPSILON) v = random();
    const r = Math.sqrt(-2 * Math.log(u));
    const theta = 2 * Math.PI * v;
    spare = r * Math.sin(theta);
    return r * Math.cos(theta);
  };
}

// Acklam inverse-normal approximation. Accurate enough for probability-copula simulation.
function invNorm(p: number) {
  const q = Math.min(.999999, Math.max(.000001, p));
  const a = [-39.6968302866538,220.946098424521,-275.928510446969,138.357751867269,-30.6647980661472,2.50662827745924];
  const b = [-54.4760987982241,161.585836858041,-155.698979859887,66.8013118877197,-13.2806815528857];
  const c = [-0.00778489400243029,-0.322396458041136,-2.40075827716184,-2.54973253934373,4.37466414146497,2.93816398269878];
  const d = [0.00778469570904146,0.32246712907004,2.445134137143,3.75440866190742];
  const plow = .02425, phigh = 1 - plow;
  if (q < plow) {
    const r = Math.sqrt(-2 * Math.log(q));
    return (((((c[0]*r+c[1])*r+c[2])*r+c[3])*r+c[4])*r+c[5]) / ((((d[0]*r+d[1])*r+d[2])*r+d[3])*r+1);
  }
  if (q > phigh) {
    const r = Math.sqrt(-2 * Math.log(1-q));
    return -(((((c[0]*r+c[1])*r+c[2])*r+c[3])*r+c[4])*r+c[5]) / ((((d[0]*r+d[1])*r+d[2])*r+d[3])*r+1);
  }
  const r = q - .5, s = r*r;
  return (((((a[0]*s+a[1])*s+a[2])*s+a[3])*s+a[4])*s+a[5])*r / (((((b[0]*s+b[1])*s+b[2])*s+b[3])*s+b[4])*s+1);
}

export function correlatedAtLeastOne(probabilitiesPct: number[], seedText = 'firefall', iterations = 7000, rho = .55) {
  if (!probabilitiesPct.length) return 0;
  if (probabilitiesPct.length === 1) return Math.round(probabilitiesPct[0]);
  const thresholds = probabilitiesPct.map(p => invNorm(Math.min(1, Math.max(0, p / 100))));
  const normal = normalGenerator(hashSeed(seedText));
  const residual = Math.sqrt(1 - rho*rho);
  let success = 0;
  for (let n = 0; n < iterations; n++) {
    let z = normal();
    let hit = z <= thresholds[0];
    for (let i = 1; i < thresholds.length; i++) {
      z = rho * z + residual * normal();
      if (z <= thresholds[i]) hit = true;
    }
    if (hit) success++;
  }
  return Math.round(success / iterations * 100);
}

export function bestTripWindows(days: DayForecast[], maxNights = 4): TripWindow[] {
  const out: TripWindow[] = [];
  for (let nights = 1; nights <= Math.min(maxNights, days.length); nights++) {
    let best: TripWindow | null = null;
    for (let start = 0; start <= days.length - nights; start++) {
      const window = days.slice(start, start + nights);
      if (window.some(d => d.probability === null)) continue;
      const probabilities = window.map(d => d.probability as number);
      const probability = correlatedAtLeastOne(probabilities, window.map(d => d.date).join('|'));
      const bestDay = [...window].sort((a,b) => (b.probability ?? -1) - (a.probability ?? -1))[0];
      const candidate: TripWindow = {
        nights,
        startDate: window[0].date,
        endDate: window.at(-1)!.date,
        probability,
        bestDate: bestDay.date,
        bestProbability: bestDay.probability as number,
        method: 'gaussian-copula-correlated'
      };
      if (!best || candidate.probability > best.probability) best = candidate;
    }
    if (best) out.push(best);
  }
  return out;
}

import raw from '@/data/outcomes.json';

export type VerifiedOutcome = {
  date: string;
  probability: number;
  outcome: 0 | 1;
  source: string;
  verifiedAt: string;
};

export type CalibrationMetrics = {
  sampleSize: number;
  minimumSample: number;
  status: 'insufficient-data' | 'calibrating' | 'measured';
  brierScore: number | null;
  logLoss: number | null;
  expectedCalibrationError: number | null;
  climatologyBrier: number | null;
  brierSkillScore: number | null;
};

type OutcomeFile = {
  minimumCalibrationSample: number;
  observations: VerifiedOutcome[];
};

const dataset = raw as OutcomeFile;
const clampProbability = (p: number) => Math.min(0.999999, Math.max(0.000001, p / 100));

export function computeCalibration(observations: VerifiedOutcome[], minimumSample = 30): CalibrationMetrics {
  const valid = observations.filter(o => Number.isFinite(o.probability) && o.probability >= 0 && o.probability <= 100 && (o.outcome === 0 || o.outcome === 1));
  const n = valid.length;
  if (!n) {
    return {
      sampleSize: 0, minimumSample,
      status: 'insufficient-data',
      brierScore: null, logLoss: null, expectedCalibrationError: null,
      climatologyBrier: null, brierSkillScore: null
    };
  }

  const probs = valid.map(o => clampProbability(o.probability));
  const outcomes = valid.map(o => o.outcome);
  const brierScore = probs.reduce<number>((sum, p, i) => sum + (p - outcomes[i]) ** 2, 0) / n;
  const logLoss = probs.reduce<number>((sum, p, i) => sum - (outcomes[i] * Math.log(p) + (1 - outcomes[i]) * Math.log(1 - p)), 0) / n;
  const baseRate = outcomes.reduce<number>((a, b) => a + b, 0) / n;
  const climatologyBrier = outcomes.reduce<number>((sum, y) => sum + (baseRate - y) ** 2, 0) / n;
  const brierSkillScore = climatologyBrier > 0 ? 1 - brierScore / climatologyBrier : null;

  let ece = 0;
  for (let lower = 0; lower < 1; lower += 0.1) {
    const upper = lower + 0.1;
    const indices = probs.map((p, i) => ({ p, i })).filter(x => x.p >= lower && (upper >= 1 ? x.p <= upper : x.p < upper));
    if (!indices.length) continue;
    const meanP = indices.reduce((s, x) => s + x.p, 0) / indices.length;
    const meanY = indices.reduce<number>((s, x) => s + outcomes[x.i], 0) / indices.length;
    ece += (indices.length / n) * Math.abs(meanP - meanY);
  }

  return {
    sampleSize: n,
    minimumSample,
    status: n < minimumSample ? 'insufficient-data' : n < minimumSample * 2 ? 'calibrating' : 'measured',
    brierScore,
    logLoss,
    expectedCalibrationError: ece,
    climatologyBrier,
    brierSkillScore
  };
}

export function currentCalibration() {
  return computeCalibration(dataset.observations, dataset.minimumCalibrationSample);
}

# Yosemite Firefall Live — Release Scorecard

The product is released against measurable decision quality, trust, performance, and organic-growth criteria. It is not scored on feature count.

## Hard vetoes

A release fails regardless of total score if any of these are true:

- A probability is shown when solar geometry is impossible.
- A favorable Horsetail water signal can be produced by Merced River discharge alone.
- Generic Yosemite cloud cover is used as the primary western-sky predictor when corridor data are available.
- Missing critical water or cloud data silently becomes a confident numeric forecast.
- A stale GOES observation is presented as live.
- A prior year's NPS reservation/parking rule is presented as current.
- Terrain-derived cutoff timing affects the forecast before the illuminated water-column origin is independently validated.
- Production dependency audit reports a high or critical vulnerability.
- CI tests, typecheck, or production build fail.

## Weighted value function — 100 points

### Decision usefulness — 30
- Tonight/next viable evening probability visible immediately: 6
- Peak glow window and sunset: 5
- Arrival planning target with non-NPS heuristic disclosure: 3
- Seven-night comparison and best-night selection: 6
- Correlated 1–4-night trip optimizer: 6
- One-sentence explanation of the dominant drivers: 4

### Scientific integrity — 30
- Conjunctive sun × water × cloud model with hard geometry veto: 6
- Source-gated Horsetail runoff proxy: 5
- Four-point western NWS sun corridor: 5
- GOES-18 near-event observation layer with freshness/DQF: 5
- Explicit source freshness and confidence: 4
- Verified-outcome calibration ledger and scoring metrics: 5

### Reliability/security — 15
- Tests + TypeScript + production build green: 5
- High/critical production dependency audit green: 4
- Reproducible lockfile: 2
- Automated external source-contract checks: 4

### Search/CTR value — 15
- Stable canonical URL with descriptive title/meta: 3
- Indexable explanatory content answering Firefall-intent questions: 3
- FAQ/WebApplication structured data: 2
- Dynamic social preview: 2
- Same URL has useful preseason and in-season states: 2
- Search Console measurement plan compares CTR within position bands: 3

### Performance/accessibility — 10
- Map is lazy-loaded below the decision surface: 2
- Responsive 390px first viewport preserves decision answer: 2
- Keyboard-accessible night selector/map markers: 2
- Core Web Vitals targets: LCP p75 ≤2.5s, INP p75 ≤200ms, CLS p75 ≤0.1: 4

## Release thresholds

- `>= 90`: release candidate, if every hard veto passes.
- `85–89`: preview only; fix the largest decision/trust gap.
- `< 85`: do not launch.

## Probability calibration benchmark

The model must never call itself statistically calibrated with fewer than 30 independently verified dated outcomes. Once `n >= 30`, track:

- Brier score — lower is better.
- Brier Skill Score versus observed climatology — target `> 0` before claiming skill over baseline.
- Expected Calibration Error — target `<= 0.10`.
- Log loss — monitor for overconfident misses.

Outcome labels require a reliable dated source confirming whether a visible orange/red Firefall occurred during the modeled event window. Ambiguous social photos are not labels.

## Search/CTR benchmark

Do not optimize to a generic industry CTR table. Use Search Console as the baseline and compare like with like:

1. Segment non-brand queries containing Yosemite/Horsetail/Firefall terms by average-position band.
2. Establish the prior 28-day CTR and impressions baseline for each band.
3. Primary target: `+20% relative CTR` within the same position band during the active season while impressions are non-declining.
4. Secondary target: increase total non-brand impressions without creating thin date/location doorway pages.
5. Track query families separately: probability/today, best date, peak time, weather/clouds, water/flow, parking/access, photography, and trip planning.

## Current known limitation

The USGS 3DEP preprocessing pipeline successfully generated a horizon profile, but the mapped point resolves to valley-floor terrain rather than a validated point on the illuminated Horsetail water column. Terrain data therefore remain excluded from scoring. The empirical seasonal solar envelope is the production fallback until the vertical feature origin is independently validated.

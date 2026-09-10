# Yosemite Firefall Live

A mobile-first decision engine for Yosemite's Horsetail Fall Firefall. It is designed to answer whether the natural effect is worth attempting on a given evening, when the strongest glow window occurs, and which upcoming night is strongest.

## Data architecture

- **NOAA/NWS**: raw gridded forecast data for event-window sky cover, visibility, temperature, humidity and precipitation.
- **California DWR CDEC**: nearby Sierra snow-water-equivalent context (Gin Flat / Ostrander Lake adapters).
- **USGS**: Merced River at Happy Isles as regional basin context only. The app explicitly does **not** label this as Horsetail Fall discharge. The adapter targets the modern USGS Water Data API first and temporarily falls back to legacy WaterServices during the migration period.
- **NPS**: live Yosemite alerts when `NPS_API_KEY` is configured.
- **SunCalc**: minute-level solar position and sunset timing at Horsetail Fall.

## Model behavior

Probability is conjunctive: geometry, water, western-sky openness and atmospheric clarity must coexist. Impossible geometry hard-stops the probability. Missing critical water/cloud data produces no probability rather than a fake zero. The model is explicitly labeled experimental until enough verified event outcomes exist for calibration.

The app automatically enters pre-season mode outside the event window so September weather is never presented as a February Firefall forecast.

## Local development

```bash
npm install
npm run dev
```

Tests and type checks:

```bash
npm test
npm run typecheck
npm run build
```

## Environment

Copy `.env.example` to `.env.local`. `NPS_API_KEY` is optional for rendering but recommended for live park alerts. `NEXT_PUBLIC_SITE_URL` should be set to the production canonical URL.

## Release gates represented in code

- no placeholder live values
- no probability when critical live inputs are missing
- no high probability outside viable solar geometry
- no direct-Horsetail CFS claim
- source freshness shown in UI
- 2027 access rules are never copied from 2026
- peak glow is calculated before sunset rather than equated to sunset
- mobile-first layout
- server-rendered explanatory/search content
- upstream failures degrade instead of crashing the page

## Next calibration layer

The public engine is structured so a precomputed USGS 3DEP horizon profile and GOES-18 western-sun-corridor nowcast can replace the current empirical geometry/cloud components without changing the frontend contract. Those layers should be validated against labeled 2027 Firefall outcomes before they are used to claim calibrated probabilities.

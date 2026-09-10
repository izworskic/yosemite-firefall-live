export const SITE = {
  name: 'Yosemite Firefall Live',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://yosemite-firefall-live.vercel.app',
  timezone: 'America/Los_Angeles',
  npsParkCode: 'yose',
};

export const HORSETAIL = {
  lat: 37.72912,
  lon: -119.62848,
  elevationFt: 6150,
  catchmentMinFt: 6200,
  catchmentMaxFt: 7600,
  // The public v1 geometry model uses observed/published solar alignment.
  // A precomputed DEM horizon profile can replace this without changing the API.
  viableSunsetAzimuth: [246, 263] as const,
  strongestSunsetAzimuth: [252, 258] as const,
};

export const VIEWING = {
  elCapitanPicnic: { lat: 37.7279, lon: -119.6208 },
  viewingArea: { lat: 37.72884, lon: -119.61319 },
};

export const CDEC_STATIONS = ['GIN', 'STR'] as const;
export const CDEC_SWE_SENSOR = 3;
export const USGS_HAPPY_ISLES = 'USGS-11264500';

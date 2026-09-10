import { NextResponse } from 'next/server';
import { currentCalibration } from '@/lib/calibration';

export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json({
    model: 'Yosemite Firefall Live',
    calibration: currentCalibration(),
    interpretation: 'Brier score and log loss are only reported once verified dated outcomes exist. Brier skill is measured against the observed climatology baseline.',
    generatedAt: new Date().toISOString()
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }
  });
}

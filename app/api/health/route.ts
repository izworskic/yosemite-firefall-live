import { NextResponse } from 'next/server';
import { buildFirefallSnapshot } from '@/lib/model';

export const dynamic = 'force-dynamic';

export async function GET() {
  const started = Date.now();
  const snapshot = await buildFirefallSnapshot();
  const critical = snapshot.sources.filter(s => ['National Weather Service', 'California Data Exchange Center (CDEC)'].includes(s.source));
  const unhealthy = critical.every(s => s.freshness === 'unavailable');
  return NextResponse.json({
    ok: !unhealthy,
    generatedAt: snapshot.generatedAt,
    latencyMs: Date.now() - started,
    methodologyVersion: snapshot.methodologyVersion,
    sources: snapshot.sources.map(s => ({ source: s.source, freshness: s.freshness, observedAt: s.observedAt }))
  }, { status: unhealthy ? 503 : 200, headers: { 'Cache-Control': 'no-store' } });
}

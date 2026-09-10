import { NextResponse } from 'next/server';
import { buildFirefallSnapshot } from '@/lib/model';

export const revalidate = 900;

export async function GET() {
  const snapshot = await buildFirefallSnapshot();
  return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } });
}

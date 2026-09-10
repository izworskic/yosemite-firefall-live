'use client';

import { useMemo, useState } from 'react';
import type { DayForecast, FirefallSnapshot } from '@/lib/types';
import FirefallMap from './FirefallMap';

function chanceLabel(value: number | null) {
  if (value === null) return 'FORECAST PENDING';
  if (value >= 80) return 'EXCELLENT CHANCE';
  if (value >= 60) return 'GOOD CHANCE';
  if (value >= 40) return 'POSSIBLE';
  if (value >= 20) return 'LOW CHANCE';
  return 'UNLIKELY';
}

function flowLabel(flow: DayForecast['flowIndex']) {
  return flow === 'unknown' ? 'Unknown' : flow[0].toUpperCase() + flow.slice(1);
}

function cloudDetail(day: DayForecast) {
  if (day.cloudBasis === 'goes-nowcast') return `GOES-18 + forecast${day.cloudTrend && day.cloudTrend !== 'unknown' ? ` · ${day.cloudTrend}` : ''}`;
  if (day.cloudBasis === 'sun-corridor') return 'western sun-corridor forecast';
  if (day.cloudBasis === 'local-fallback') return 'local-sky fallback · lower confidence';
  return 'cloud source unavailable';
}

function shortDate(value: string) {
  const d = new Date(`${value}T12:00:00-08:00`);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' }).format(d);
}

export default function FirefallDashboard({ snapshot }: { snapshot: FirefallSnapshot }) {
  const initial = snapshot.headline ?? snapshot.days[0] ?? null;
  const [selectedDate, setSelectedDate] = useState(initial?.date ?? '');
  const selected = useMemo(() => snapshot.days.find(d => d.date === selectedDate) ?? initial, [snapshot.days, selectedDate, initial]);

  if (snapshot.mode !== 'season') {
    const seasonLabel = snapshot.mode === 'preseason' ? 'SEASON OUTLOOK' : 'SEASON COMPLETE';
    return <>
      <section className="hero preseason" aria-labelledby="hero-title">
        <div className="hero-scenery" aria-hidden="true"><div className="cliff"/><div className="fall"/><div className="ridge"/></div>
        <div className="hero-content">
          <p className="eyebrow">YOSEMITE FIREFALL LIVE</p>
          <h1 id="hero-title">Horsetail Fall <span>{snapshot.seasonYear}</span></h1>
          <div className="status-pill">{seasonLabel}</div>
          <p className="hero-lede">The live probability engine activates during the February Firefall window. Until then, track geometry, official access updates, and the winter water setup.</p>
          <div className="preseason-grid">
            <div><b>Mid–late February</b><span>Primary geometry window</span></div>
            <div><b>Water + west sky + sun</b><span>All three must align</span></div>
            <div><b>{snapshot.seasonYear} rules pending</b><span>Prior-year access rules are not assumed</span></div>
          </div>
        </div>
      </section>
      <section className="section tight">
        <div className="section-heading"><div><p className="eyebrow dark">SOLAR ALIGNMENT</p><h2>First look at {snapshot.seasonYear} geometry</h2></div><p className="muted">These cards are geometry only, not weather probabilities.</p></div>
        <div className="day-strip geometry-strip">
          {snapshot.days.map(d => <div className="day-card" key={d.date}><span>{d.label}</span><b>{d.geometry}</b><small>geometry</small></div>)}
        </div>
      </section>
      <SourceStrip snapshot={snapshot}/>
      <FirefallMap/>
    </>;
  }

  if (!selected) return null;
  const generatedLocalDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date(snapshot.generatedAt));
  const headlineTitle = selected.date === generatedLocalDate ? 'Tonight' : selected.label;

  return <>
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-scenery" aria-hidden="true"><div className="cliff"/><div className="fall"/><div className="ridge"/></div>
      <div className="hero-content">
        <p className="eyebrow">YOSEMITE FIREFALL LIVE</p>
        <h1 id="hero-title">{headlineTitle}</h1>
        <div className="probability-row"><strong>{selected.probability === null ? '—' : `${selected.probability}%`}</strong><div><span className="chance">{chanceLabel(selected.probability)}</span><span className="confidence">Confidence: {selected.confidence}</span></div></div>
        <div className="peak-card"><span>PEAK GLOW</span><b>{selected.peakStart}–{selected.peakEnd}</b><small>Sunset {selected.sunset}</small></div>
        <p className="why"><b>Why:</b> {selected.why}.</p>
        <div className="metric-grid">
          <Metric label="Horsetail flow" value={flowLabel(selected.flowIndex)} detail={selected.flowScore === null ? 'model uncertain' : `${selected.flowScore}/100 runoff signal`}/>
          <Metric label="Western sky" value={selected.cloudOpen === null ? 'Unknown' : `${selected.cloudOpen}% open`} detail={cloudDetail(selected)}/>
          <Metric label="Sun geometry" value={`${selected.geometry}/100`} detail={selected.terrainBased ? 'terrain-aware cutoff' : 'validated seasonal alignment'}/>
          <Metric label="Atmosphere" value={selected.clarity === null ? 'Unknown' : `${selected.clarity}/100`} detail="visibility + humidity"/>
        </div>
      </div>
    </section>

    <section className="section tight" aria-labelledby="week-title">
      <div className="section-heading"><div><p className="eyebrow dark">NEXT 7 EVENINGS</p><h2 id="week-title">Pick the strongest night</h2></div>{snapshot.bestDay && <div className="best-night"><span>BEST CURRENT NIGHT</span><b>{snapshot.bestDay.label} · {snapshot.bestDay.probability}%</b></div>}</div>
      <div className="day-strip">
        {snapshot.days.map(d => <button className={`day-card ${d.date === selected.date ? 'selected' : ''}`} key={d.date} onClick={() => setSelectedDate(d.date)}><span>{d.label}</span><b>{d.probability === null ? '—' : `${d.probability}%`}</b><small>{d.geometry < 10 ? 'poor geometry' : d.confidence}</small></button>)}
      </div>
      <div className="selected-detail">
        <div><span>Selected</span><b>{selected.label}, {selected.date}</b></div>
        <div><span>Peak</span><b>{selected.peakStart}–{selected.peakEnd}</b></div>
        <div><span>Potential quality</span><b>{selected.quality ?? '—'}/100</b></div>
        <div><span>Confidence</span><b>{selected.confidence}</b></div>
      </div>
    </section>

    {snapshot.tripWindows.length > 1 && <section className="section tight" aria-labelledby="trip-title">
      <div className="section-heading"><div><p className="eyebrow dark">TRAVEL DECISION</p><h2 id="trip-title">Best stay window</h2></div><p className="muted">Odds preserve correlation between adjacent weather days instead of pretending each night is independent.</p></div>
      <div className="selected-detail">
        {snapshot.tripWindows.map(w => <div key={w.nights}><span>{w.nights} NIGHT{w.nights > 1 ? 'S' : ''}</span><b>{w.probability}% at least once</b><small>{shortDate(w.startDate)}{w.endDate !== w.startDate ? `–${shortDate(w.endDate)}` : ''} · best {shortDate(w.bestDate)} ({w.bestProbability}%)</small></div>)}
      </div>
    </section>}

    <SourceStrip snapshot={snapshot}/>
    <FirefallMap/>
  </>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="metric"><span>{label}</span><b>{value}</b><small>{detail}</small></div>;
}

function SourceStrip({ snapshot }: { snapshot: FirefallSnapshot }) {
  return <section className="section sources"><div className="section-heading"><div><p className="eyebrow dark">DATA HEALTH</p><h2>What the engine can see</h2></div><p className="muted">Generated {new Date(snapshot.generatedAt).toLocaleString()}</p></div><div className="source-grid">{snapshot.sources.map(s => <div className="source" key={s.source}><span className={`dot ${s.freshness}`}/><div><b>{s.source}</b><small>{s.freshness}{s.observedAt ? ` · obs ${new Date(s.observedAt).toLocaleString()}` : ''}{s.note ? ` · ${s.note}` : ''}</small></div></div>)}</div></section>;
}

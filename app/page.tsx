import FirefallDashboard from '@/components/FirefallDashboard';
import { buildFirefallSnapshot } from '@/lib/model';

export const revalidate = 900;

export default async function Home() {
  const snapshot = await buildFirefallSnapshot();
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: 'Yosemite Firefall Live',
    description: 'Independent Horsetail Fall Firefall probability, timing, water and western-sky decision support.',
    about: { '@type': 'Place', name: 'Horsetail Fall, Yosemite National Park' }
  };

  return <main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}/>
    <FirefallDashboard snapshot={snapshot}/>

    <section className="section access" id="access">
      <div className="access-card"><p className="eyebrow">ACCESS STATUS</p><h2>Verify this season’s Yosemite rules</h2><p>{snapshot.accessStatus}</p>{snapshot.alerts.length > 0 && <div className="alerts"><b>Current NPS alerts</b>{snapshot.alerts.map(a => <span key={a}>{a}</span>)}</div>}<a className="button-link" href="https://www.nps.gov/yose/planyourvisit/horsetailfall.htm" target="_blank" rel="noreferrer">Official NPS Horsetail Fall guidance ↗</a></div>
    </section>

    <section className="section explainer" id="methodology">
      <div className="section-heading"><div><p className="eyebrow dark">HOW IT WORKS</p><h2>Three things must line up</h2></div></div>
      <div className="explain-grid">
        <article><span>01</span><h3>Water</h3><p>Horsetail Fall is ephemeral. The engine combines Sierra snow-water information, temperature-driven melt, precipitation and regional hydrologic context. It never pretends the Merced gauge is Horsetail discharge.</p></article>
        <article><span>02</span><h3>Western sky</h3><p>Clouds that block the setting sun matter much more than clouds elsewhere. The current version uses NWS gridded sky cover during the event window; corridor-specific satellite nowcasting is the next calibration layer.</p></article>
        <article><span>03</span><h3>Solar alignment</h3><p>The engine calculates sunset position and only permits meaningful probability when the sun enters the known Firefall alignment envelope. Peak timing is calculated before sunset, not copied from the sunset time.</p></article>
      </div>
      <div className="method-note"><b>Experimental probability model · {snapshot.methodologyVersion}</b><p>Probabilities are decision-support estimates, not guarantees. A false “go” can cost visitors substantial travel time, so the model intentionally penalizes uncertain water and cloud conditions. Each upstream source carries its own freshness state.</p></div>
    </section>

    <section className="section faq" id="faq">
      <p className="eyebrow dark">FIREFALL QUESTIONS</p><h2>Planning a Horsetail Fall evening</h2>
      <details><summary>When does Yosemite Firefall happen?</summary><p>The natural effect is possible during a short mid-to-late February window when low-angle sunset light can illuminate flowing Horsetail Fall. Water and a sufficiently clear western sky are still required.</p></details>
      <details><summary>Is Firefall guaranteed on the best date?</summary><p>No. Solar geometry is predictable; water and cloud conditions are not. This tool combines those dependencies and exposes confidence rather than presenting a date as a guarantee.</p></details>
      <details><summary>Does Yosemite Firefall require a reservation?</summary><p>Rules can change by year. This site does not copy last year’s reservation or traffic rules into a new season. Check the linked National Park Service guidance before traveling.</p></details>
      <details><summary>Why not just use the Yosemite weather forecast?</summary><p>Generic weather does not answer whether Horsetail Fall has enough water or whether the setting-sun geometry is viable. Firefall is an intersection of hydrology, atmosphere and solar position.</p></details>
    </section>

    <footer><b>Yosemite Firefall Live</b><span>{snapshot.disclaimer}</span><span>Data: NOAA/NWS · California DWR CDEC · USGS · National Park Service when configured</span></footer>
  </main>;
}

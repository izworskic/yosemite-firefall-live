import FirefallDashboard from '@/components/FirefallDashboard';
import { currentCalibration } from '@/lib/calibration';
import { SITE } from '@/lib/config';
import { buildFirefallSnapshot } from '@/lib/model';

export const revalidate = 900;

const faqs = [
  {
    q: 'When does Yosemite Firefall happen?',
    a: 'The natural effect is possible during a short mid-to-late February window when low-angle sunset light can illuminate flowing Horsetail Fall. Water and a sufficiently clear western sky are still required.'
  },
  {
    q: 'Is Firefall guaranteed on the best date?',
    a: 'No. Solar geometry is predictable; water and cloud conditions are not. This tool combines those dependencies and exposes confidence rather than presenting a date as a guarantee.'
  },
  {
    q: 'Does Yosemite Firefall require a reservation?',
    a: 'Rules can change by year. This site does not copy a prior year’s reservation or traffic rules into a new season. Check the linked National Park Service guidance before traveling.'
  },
  {
    q: 'Why not just use the Yosemite weather forecast?',
    a: 'Generic weather does not answer whether Horsetail Fall has enough source water or whether clouds lie directly in the setting-sun corridor. Firefall is an intersection of hydrology, atmosphere and solar position.'
  }
];

export default async function Home() {
  const snapshot = await buildFirefallSnapshot();
  const calibration = currentCalibration();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'Yosemite Firefall Live',
        url: SITE.url,
        applicationCategory: 'WeatherApplication',
        operatingSystem: 'Web',
        description: 'Independent Horsetail Fall Firefall probability, peak glow timing, source-water outlook, western-sky corridor conditions and multi-night trip planning.',
        about: { '@type': 'Place', name: 'Horsetail Fall, Yosemite National Park' }
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map(item => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a }
        }))
      }
    ]
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
        <article><span>01</span><h3>Source water</h3><p>Horsetail Fall is ephemeral and has a small watershed. The engine combines Gin Flat and Ostrander snow-water measurements, snowpack change, temperature-driven melt and recent precipitation. Merced River discharge is only corroborating basin context; it cannot create a favorable Horsetail signal on its own.</p></article>
        <article><span>02</span><h3>Western sun corridor</h3><p>Clouds between the setting sun and El Capitan matter more than generic Yosemite cloud cover. The engine samples NWS gridded sky cover 10, 25, 50 and 100 km west-southwest. Near the event window, fresh GOES-18 Clear Sky Mask observations can progressively replace forecast uncertainty.</p></article>
        <article><span>03</span><h3>Solar alignment</h3><p>The engine calculates sun position minute by minute and hard-stops the probability outside the established Firefall alignment envelope. A USGS 3DEP terrain profile was generated, but it is deliberately excluded from scoring until the illuminated water-column elevation can be independently validated.</p></article>
      </div>
      <div className="method-note"><b>Experimental probability model · {snapshot.methodologyVersion}</b><p>Probabilities are decision-support estimates, not guarantees. A false “go” can cost visitors substantial travel time, so uncertain source-water and cloud conditions are penalized. Each upstream source carries a freshness state.</p></div>
      <div className="method-note"><b>Calibration: {calibration.status === 'insufficient-data' ? 'collecting verified outcomes' : calibration.status}</b><p>{calibration.sampleSize} verified dated outcomes are in the calibration ledger; {calibration.minimumSample} are required before the model will describe itself as statistically calibrated. Brier score, log loss, reliability error and skill against climatology are computed from that ledger rather than inferred from anecdotal reports.</p></div>
    </section>

    <section className="section faq" id="faq">
      <p className="eyebrow dark">FIREFALL QUESTIONS</p><h2>Planning a Horsetail Fall evening</h2>
      {faqs.map(item => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
    </section>

    <footer><b>Yosemite Firefall Live</b><span>{snapshot.disclaimer}</span><span>Data: NOAA/NWS · NOAA GOES-18 · California DWR CDEC · USGS · National Park Service</span></footer>
  </main>;
}

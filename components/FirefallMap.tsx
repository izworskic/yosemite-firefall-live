'use client';

import { useEffect, useRef } from 'react';
import { Map, Marker, NavigationControl, Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const points = [
  { name: 'Horsetail Fall', lon: -119.62848, lat: 37.72912 },
  { name: 'Firefall viewing area', lon: -119.61319, lat: 37.72884 },
  { name: 'El Capitan Picnic Area', lon: -119.6208, lat: 37.7279 }
];

export default function FirefallMap() {
  const node = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!node.current) return;
    const map = new Map({ container: node.current, style: 'https://tiles.openfreemap.org/styles/liberty', center: [-119.621, 37.728], zoom: 13.25, attributionControl: {} });
    map.addControl(new NavigationControl({ showCompass: true }), 'top-right');
    points.forEach(p => {
      const el = document.createElement('button');
      el.className = 'map-marker';
      el.type = 'button';
      el.setAttribute('aria-label', p.name);
      new Marker({ element: el }).setLngLat([p.lon, p.lat]).setPopup(new Popup({ offset: 18 }).setText(p.name)).addTo(map);
    });
    return () => map.remove();
  }, []);
  return <section className="section map-section" aria-labelledby="map-title"><div className="section-heading"><div><p className="eyebrow dark">VIEWING GEOGRAPHY</p><h2 id="map-title">Horsetail Fall and the viewing corridor</h2></div><p className="muted">Always follow current NPS closures and pedestrian controls.</p></div><div className="map-wrap" ref={node}/></section>;
}

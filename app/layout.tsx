import type { Metadata } from 'next';
import './globals.css';
import { SITE } from '@/lib/config';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: 'Yosemite Firefall 2027: Live Horsetail Fall Forecast', template: '%s | Yosemite Firefall Live' },
  description: "See Yosemite Horsetail Fall Firefall probability, peak glow time, water-flow outlook, western-sky conditions, and the best upcoming viewing night.",
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    title: 'Yosemite Firefall Live',
    description: 'A live decision engine for Horsetail Fall: timing, water, western sky, confidence and the best night to go.',
    url: '/',
    siteName: 'Yosemite Firefall Live'
  },
  twitter: { card: 'summary_large_image', title: 'Yosemite Firefall Live', description: 'Live Horsetail Fall probability, timing, water and western-sky outlook.' },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

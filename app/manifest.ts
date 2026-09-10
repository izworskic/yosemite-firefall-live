import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest { return { name: 'Yosemite Firefall Live', short_name: 'Firefall Live', description: 'Horsetail Fall Firefall decision-support forecast.', start_url: '/', display: 'standalone', background_color: '#f4f0e7', theme_color: '#173c2d' }; }

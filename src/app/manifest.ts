import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ClinTechBills · MediBurgh Discipline 075',
    short_name: 'ClinTechBills',
    description:
      'POPIA-compliant Discipline 075 Clinical Technology case capture, sticker upload, and billing office reconciliation.',
    start_url: '/capture',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#090B0E',
    theme_color: '#00D2C6',
    categories: ['medical', 'business', 'productivity'],
    icons: [
      {
        src: '/images/mediburgh-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/images/mediburgh-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'New Case Capture',
        short_name: 'Capture',
        description: 'Capture a new Discipline 075 patient case and hospital sticker',
        url: '/capture',
        icons: [{ src: '/images/mediburgh-icon.png', sizes: '512x512' }],
      },
      {
        name: 'Billing Office Queue',
        short_name: 'Queue',
        description: 'Review submitted cases and enter PMS account numbers',
        url: '/queue',
        icons: [{ src: '/images/mediburgh-icon.png', sizes: '512x512' }],
      },
    ],
  };
}
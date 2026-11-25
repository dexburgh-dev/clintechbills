import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Montserrat } from 'next/font/google';
import { PwaInstallBanner } from '@/components/PwaInstallBanner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ClinTechBills · MediBurgh Discipline 075 Portal',
  description:
    'Precision Billing. Protected Revenue. Clinical Technology (Discipline 075) mobile case capture and billing office reconciliation.',
  applicationName: 'ClinTechBills',
  icons: {
    icon: '/images/mediburgh-icon.png',
    shortcut: '/images/mediburgh-icon.png',
    apple: '/images/mediburgh-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ClinTechBills',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#090B0E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${montserrat.variable} ${jetbrainsMono.variable} dark`}
    >
      <body className="bg-[#090B0E] text-[#F3F6FA] font-[family-name:var(--font-inter)] antialiased selection:bg-[#00D2C6]/30 selection:text-white">
        {children}
        <PwaInstallBanner />
      </body>
    </html>
  );
}
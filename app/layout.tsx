import type { Metadata, Viewport } from 'next';
import { Source_Serif_4, Source_Sans_3 } from 'next/font/google';
import './globals.css';

const serif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const sans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#F4EFE6',
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
};

export const metadata: Metadata = {
  title: 'Folio',
  description: 'A calm, lightweight novel-writing studio with private Google Drive multi-device synchronization.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Folio',
  },
  openGraph: {
    title: 'Folio',
    description: 'A calm, lightweight novel-writing studio with private Google Drive multi-device synchronization.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Folio',
    description: 'A calm, lightweight novel-writing studio with private Google Drive multi-device synchronization.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#F4EFE6] text-[#1C1917] font-sans antialiased selection:bg-[#E7E0D4] selection:text-[#1C1917]"
      >
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(e) {
                    console.log('SW registration note:', e);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

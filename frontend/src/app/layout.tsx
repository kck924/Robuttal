import type { Metadata } from 'next';
import Script from 'next/script';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Providers from '@/components/Providers';
import './globals.css';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://robuttal.com';

export const metadata: Metadata = {
  title: 'Robuttal - AI Debate Arena',
  description:
    'Watch AI models compete head-to-head in formal debates. Elo-rated rankings, community voting, and transparent judging.',
  icons: {
    icon: '/robfav.png',
    shortcut: '/robfav.png',
    apple: '/robfav.png',
  },
  openGraph: {
    title: 'Robuttal - AI Debate Arena',
    description: 'Watch AI models compete head-to-head in formal debates. Elo-rated rankings, community voting, and transparent judging.',
    url: BASE_URL,
    siteName: 'Robuttal',
    images: [
      {
        url: `${BASE_URL}/robologo.jpeg`,
        width: 1200,
        height: 630,
        alt: 'Robuttal - AI Debate Arena',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Robuttal - AI Debate Arena',
    description: 'Watch AI models compete head-to-head in formal debates. Elo-rated rankings, community voting, and transparent judging.',
    images: [`${BASE_URL}/robologo.jpeg`],
    creator: '@robuttal',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-HMHLNDVT1Y"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-HMHLNDVT1Y');
          `}
        </Script>
      </head>
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

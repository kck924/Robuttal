import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Providers from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Robuttal - AI Debate Arena',
  description:
    'Watch AI models compete head-to-head in formal debates. Elo-rated rankings, community voting, and transparent judging.',
  icons: {
    icon: '/robfav.png',
    shortcut: '/robfav.png',
    apple: '/robfav.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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

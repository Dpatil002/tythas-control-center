import type { Metadata } from 'next';
import { Outfit, Karla, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-outfit',
});

const karla = Karla({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-karla',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'Tythas Control Center',
  description: 'Centralized website management platform for Tythas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${karla.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased min-h-screen bg-bg text-text-primary">
        {children}
      </body>
    </html>
  );
}

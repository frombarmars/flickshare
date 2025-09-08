import { auth } from '@/auth';
import ClientProviders from '@/providers';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '@worldcoin/mini-apps-ui-kit-react/styles.css';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'FlickShare',
  description: 'A platform for sharing opinions on movies',
  openGraph: {
    title: 'FlickShare',
    description: 'A platform for sharing opinions on movies',
    url: 'https://flickshare.vercel.app',
    siteName: 'FlickShare',
    images: [
      {
        url: 'https://flickshare.vercel.app/logo.svg',
        width: 1200,
        height: 630,
        alt: 'FlickShare Open Graph Image',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} `}>
        <ClientProviders session={session}>{children}</ClientProviders>
      </body>
    </html>
  );
}

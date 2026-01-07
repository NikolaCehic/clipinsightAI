import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from '@/components/ui/sonner';
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
  title: 'ClipInsight AI - Transform Video Into Multi-Channel Content',
  description:
    'ClipInsight AI is an elite content repurposing engine powered by Google Gemini. Upload video and instantly generate newsletters, tweets, LinkedIn posts, and SEO blogs.',
  keywords: [
    'video repurposing',
    'content marketing',
    'AI content generation',
    'social media automation',
    'newsletter generator',
    'SEO blog writer',
  ],
  authors: [{ name: 'ClipInsight AI' }],
  openGraph: {
    title: 'ClipInsight AI - Transform Video Into Multi-Channel Content',
    description:
      'Upload your video and let AI generate newsletters, tweets, LinkedIn posts, and SEO blogs in seconds.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <SessionProvider>
          {children}
          <Toaster position="bottom-right" />
        </SessionProvider>
      </body>
    </html>
  );
}
